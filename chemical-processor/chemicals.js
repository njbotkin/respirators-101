const deepmerge = require('deepmerge')

let form_coercion = {
	'total': 		'Total dust',
	'total dust': 	'Total dust',
	'Total dust': 	'Total dust',

	'resp': 				'Respirable dust',
	'resp dust': 			'Respirable dust',
	'Respirable fraction': 	'Respirable dust',
	'Respirable Fraction': 	'Respirable dust',
	'Respirable dust': 		'Respirable dust',
}

function format_form(f) {
	f = f.trim()
	if(form_coercion[f]) f = form_coercion[f]
	// else console.log('UNCOERCED FORM:', f)

	return (f.charAt(0).toUpperCase() + f.slice(1)).replace(/<a[^<]+<\/a>/, '')
}

let chemicals = {}

let standards = ['niosh_rel', 'osha_pel', 'cal_osha_pel']
let duration_names = ['default', 'ceiling', 'stel']

let durations = {
	osha_pel: {
		default: 8 * 60,
		stel: 15
	},
	cal_osha_pel: {
		default: 8 * 60,
		stel: 15
	},
	niosh_rel: {
		default: 10 * 60,
		stel: 15
	}
}

class Chemical {
	constructor(props) {
		this.rtecs = ''
		Object.assign(this, props)

		// STANDARD -> FORM -> DURATION -> UNIT -> VALUE
		if(!this.standards) {
			this.standards = {}
			for(let standard of standards) {
				this.standards[standard] = {
					forms: {},
					notes: []
				}
			}
		}
	}
	merge(src, overwrite) {
		if(overwrite) {
			Object.assign(this, deepmerge(this, src))
		} else {
			Object.assign(this, deepmerge(src, this))
		}
	}
	serialize() {
		return JSON.parse(JSON.stringify(this))
	}
	addForm(form_name) {
		form_name = format_form(form_name)
		for(let standard in this.standards) {
			let s = this.standards[standard]
			if(!s.forms[form_name]) {
				s.forms[form_name] = {
					durations: {},
					notes: []
				}
				for(let duration of duration_names) {
					s.forms[form_name].durations[duration] = { values: {} }
					if(durations[standard][duration]) s.forms[form_name].durations[duration].duration = durations[standard][duration]
				}
			}
		}
		return form_name
	}
}

function newChemical(args, overwrite = false) {
	if(!chemicals[args.name]) {
		chemicals[args.name] = new Chemical(args)
	} else {
		chemicals[args.name].merge(args, overwrite)
	}
	return chemicals[args.name]
}

module.exports = {
	chemicals,
	newChemical
}