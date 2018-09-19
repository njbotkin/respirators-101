const { readFileSync, writeFileSync } = require('fs')
const { join: joinPath } = require(`path`)

var chemicals = JSON.parse(readFileSync(joinPath(__dirname, '../chemical-data/chemicals.json'), { encoding: `utf8` }))

var chemical_output = []

// fix links, link appendices, etc 
function linkify(s) {
	return s.replace(/Appendix ([a-zA-Z])/g, (match, p1, offset, string) => {
		return '<a href="https://www.cdc.gov/niosh/npg/nengapdx' + p1.toLowerCase() + '.html">' + match + '</a>'
	})
	.replace(/<a href='#' external data-url='([^']+)'>/g, (match, p1, offset, string) => {
		return '<a href="' + p1 + '">'
	})
}

var cas_to_chemical = {}
var name_to_chemical = {}

let allForms = new Set()

function format_form(f) {
	if(f == 'total' || f == 'total dust') f = 'Total dust'
	if(f == 'resp' || f == 'resp dust') f = 'Respirable fraction'
	return (f.charAt(0).toUpperCase() + f.slice(1)).trim().replace(/<a[^<]+<\/a>/, '')
}

function munge_exposure_limit(standard, chemical, n) {

	var carcinogens

	let { standards } = chemical

	// this one's easy
	if(n.slice(0, 3) === 'Ca ') {
		carcinogens = true
		n = n.slice(3)
	}

	var hold = []
	n = n

	// cleanup
	.replace('<BR>', '')
	.replace(/\[skin\]/g, function() {
		chemical.skin = true
		return ''
	})

	// units
	.replace(/([0-9.,]+) ppm/g, (match, p1) => {
		hold.push({ ppm: p1 })
		return `{${hold.length-1}}`
	})
	.replace(/([0-9.,]+) mg\/m<SUP>3<\/SUP>/g, (match, p1) => {
		hold.push({ mgm3: p1 })
		return `{${hold.length-1}}`
	})

	// manual durations
	.replace( /\[([0-9]+)-minute\]/g, (match, p1) => `{_${ p1 }_}` )
	.replace( /\[([0-9]+)-hour\]/g, (match, p1) => `{_${ p1 * 60 }_}` )
	.replace( /\[([0-9]+)-hr\]/g, (match, p1) => `{_${ p1 * 60 }_}` )

	// duration classes of exposure limits
	.replace(/TWA {([0-9])}( \({([0-9])}\))?( {_([0-9]+)_})?/g, (match, p1, p2, p3, p4, p5) => {
		if(p3) Object.assign(hold[p1], hold[p3])
		hold.push([ 'default', hold[p1], p5 ])
		return `{-${hold.length-1}-}`
	})
	.replace(/C {([0-9])}( \({([0-9])}\))?( {_([0-9]+)_})?/g, (match, p1, p2, p3, p4, p5) => {
		if(p3) Object.assign(hold[p1], hold[p3])
		hold.push([ 'ceiling', hold[p1], p5 ])
		return `{-${hold.length-1}-}`
	})
	.replace(/ST {([0-9])}( \({([0-9])}\))?( {_([0-9]+)_})?/g, (match, p1, p2, p3, p4, p5) => {
		if(p3) Object.assign(hold[p1], hold[p3])
		hold.push([ 'stel', hold[p1], p5 ])
		return `{-${hold.length-1}-}`
	})
	// sometimes not specified
	.replace(/{([0-9])}( \({([0-9])}\))?( {_([0-9]+)_})?/g, (match, p1, p2, p3, p4, p5) => {
		if(p3) Object.assign(hold[p1], hold[p3])
		hold.push([ 'default', hold[p1], p5 ])
		return `{-${hold.length-1}-}`
	})

	// forms of chemicals 

	// (as CrO<SUB>3</SUB>): {x}
	.replace(/\(as ([^:]+)\):( {-[0-9]-})+/g, (match, p1) => {
		let form = format_form(p1)
		allForms.add(form)

		if(!standards[standard].forms[form]) standards[standard].forms[form] = newForm(standard)

		match.replace(/{-([0-9])-}/g, (match, p2) => {
			let dur = standards[standard].forms[form][hold[p2][0]]
			Object.assign(dur.values, hold[p2][1])
			if(hold[p2][2]) dur.duration = hold[p2][2]
		})

		return ''
	})

	// {x} (as Cr)
	.replace(/({-[0-9]-} )+\(as ([^)]+)\)/g, (match, p1, p2) => {
		let form = format_form(p2)
		allForms.add(form)

		if(!standards[standard].forms[form]) standards[standard].forms[form] = newForm(standard)

		match.replace(/{-([0-9])-}/g, (match, p3) => {
			let dur = standards[standard].forms[form][hold[p3][0]]
			Object.assign(dur.values, hold[p3][1])
			if(hold[p3][2]) dur.duration = hold[p3][2]
		})

		return ''
	})

	// Dust: {x}
	.replace(/([^:]+):( {-[0-9]-})+/g, (match, p1) => {
		let form = format_form(p1)
		allForms.add(form)

		if(!standards[standard].forms[form]) standards[standard].forms[form] = newForm(standard)

		match.replace(/{-([0-9])-}/g, (match, p2) => {
			let dur = standards[standard].forms[form][hold[p2][0]]
			Object.assign(dur.values, hold[p2][1])
			if(hold[p2][2]) dur.duration = hold[p2][2]
		})

		return ''
	})

	// {x} (resp)
	.replace(/({-[0-9]-} )+\(([a-z ]+)\)/g, (match, p1, p2) => {
		let form = format_form(p2)
		allForms.add(form)

		if(!standards[standard].forms[form]) standards[standard].forms[form] = newForm(standard)

		match.replace(/{-([0-9])-}/g, (match, p3) => {
			let dur = standards[standard].forms[form][hold[p3][0]]
			Object.assign(dur.values, hold[p3][1])
			if(hold[p3][2]) dur.duration = hold[p3][2]
		})

		return ''
	})

	// the rest of the durations belong to the default form
	.replace(/{-([0-9])-}/g, (match, p1) => {
		allForms.add('default')

		if(!standards[standard].forms.default) standards[standard].forms.default = newForm(standard)

		let dur = standards[standard].forms.default[hold[p1][0]]
		Object.assign(dur.values, hold[p1][1])
		if(hold[p1][2]) dur.duration = hold[p1][2]

		return ''
	})

	if(carcinogens) standards[standard].carcinogens = 1
	if(n.trim()) {
		// console.log(n)
		standards[standard].notes.push(linkify(n.trim()))
	}

}

let standards = ['niosh_rel', 'osha_pel', 'cal_osha_pel']
let duration_names = ['default', 'ceiling', 'stel']

let durations = {
	osha_pel: {
		default: 8 * 60,
		ceiling: 8 * 60,
		stel: 15
	},
	cal_osha_pel: {
		default: 8 * 60,
		ceiling: 8 * 60,
		stel: 15
	},
	niosh_rel: {
		default: 10 * 60,
		ceiling: 10 * 60,
		stel: 15
	}
}

function newForm(standard) {
	let form = {}

	for(let duration of duration_names) {
		form[duration] = {
			values: {
				ppm: 0,
				mgm3: 0
			},
			duration: durations[standard][duration]
		}
	}
	return form
}

for(var c of chemicals.chemicals) {

	if(c["cn"]) {
		let filtered_cas = c["cn"].match(/[0-9-]+/)[0]
		cas_to_chemical[filtered_cas] = chemical_output.length
	} 
	if(c["c"]) name_to_chemical[c["c"]] = chemical_output.length

	var one_ppm_in_mgm3 = ''
	if(c["co"]) {
		var validConversion = c["co"].match(/1 ppm = ([0-9.]+) mg\/m<SUP>3<\/SUP>$/)
		if(validConversion) {
			one_ppm_in_mgm3 = validConversion[1]
		}
	}

	let idlh_split = c["i"].split('<br />')

	let chemical = {
		name: c["c"],
		synonyms: c["s"].join(', '),
		cas: c["cn"],
		npg: 'https://www.cdc.gov/niosh/npg/npgd' + c["a"] + '.html',
		idlh: idlh_split.shift(),
		idlh_notes: linkify(idlh_split.join('<br />')),
		// niosh_rel: linkify(c["n"]),
		// osha_pel: linkify(c["o"]),
		physical_description: c["p"],
		exposure_routes: c["e"].charAt(0).toUpperCase() + c["e"].slice(1),
		target_organs: c["to"].charAt(0).toUpperCase() + c["to"].slice(1),
		eye: /eye/i.test(c["to"]) ? 1 : 0,
		one_ppm_in_mgm3,
		notes: '', // for ambiguous things
		standards: {},
		ps: c["ps"],
		pe: c["pe"],
		pw: c["pw"],
		pr: c["pr"],
		pc: c["pc"],
		pp: c["pp"]
	}

	// EL -> FORM -> DURATION -> UNIT -> VALUE
	for(let standard of standards) {
		chemical.standards[standard] = {
			forms: {},
			notes: []
		}
	}

	// console.log(c["n"], c["cn"])

	// super side affects ahoy, avert your eyes FPers
	munge_exposure_limit("niosh_rel", chemical, c["n"])
	munge_exposure_limit("osha_pel", chemical, c["o"])

	// console.log(chemical.forms)
	// console.log(chemical.forms[0].niosh_rel)

	chemical_output.push(chemical)

	//break
} 


// process.exit()

// integrate Z tables (overwrites on conflict)

var cheerio = require('cheerio'),
    cheerioTableparser = require('cheerio-tableparser');

const $ = cheerio.load(readFileSync(joinPath(__dirname, '../chemical-data/z1.html'), { encoding: `utf8` }))
cheerioTableparser($)
var z1_data = $("#z-1").parsetable(true, true, false)

var cas_headers = [], name_headers = []
for(let header of $('tr.headingRow').toArray()) {
	let name = $(header).children().first().text().trim()
	let cas = $(header).children().first().next().text().trim()

	if(name) name_headers.push(name)
	if(cas) cas_headers.push(cas)
}

function split(s) {
	return s.split('<br>')
}
function ceiling(s) {
	let match = s.match(/^\(C\) (.*)/)
	if(match) return match[1]
}
function stel(s) {
	let match = s.match(/^\(ST\) (.*)/)
	if(match) return match[1]
}
// function ppm(s) {
// 	let match = s.match(/([0-9.,]+) ppm/)
// 	if(match) return match[1].replace(/,/g,'')
// }
// function mgm3(s) {
// 	let match = s.match(/([0-9.,]+) mg\/m<sup>3<\/sup>/)
// 	if(match) return match[1].replace(/,/g,'')
// }
// function carcinogens(s) {
// 	return s === 'Ca'
// }


const SUBSTANCE = 0,
	CAS = 1,
	OSHA_PEL_PPM = 2,
	OSHA_PEL_MGM3 = 3,
	CAL_OSHA_PEL = 4,
	NIOSH_REL = 5

let all = z1_data[0].length
var parent = null
// console.log(z1_data[CAS].length, chemical_output.length)
// var found_by_cas = 0, found_by_name = 0, children = 0

for(let i = 0; i < all; i++) {
	let cas = z1_data[CAS][i].trim(), name = z1_data[SUBSTANCE][i].trim()

	var chemical, form

	// identify by CAS and name together
	// if(cas !== '' && cas_to_chemical[cas] !== undefined && name !== '' && name_to_chemical[name] !== undefined) {

	// 	chemical = chemical_output[cas_to_chemical[cas]]
	// 	form = 'default'

	// 	if(cas_headers.indexOf(cas) > -1) {
	// 		parent = chemical
	// 		continue
	// 	} else {
	// 		parent = null
	// 	}
	// } 

	// identify by name
	if(name !== '' && name_to_chemical[name] !== undefined) {

		chemical = chemical_output[name_to_chemical[name]]
		form = 'default'

		if(name_headers.indexOf(name) > -1) {
			parent = chemical
			continue
		} else {
			parent = null
		}
	}

	// child ELs
	else if(parent && cas == '') {
		// children++;
		chemical = parent
		form = format_form(z1_data[SUBSTANCE][i])
	}

	else {
		// nothing I can do for you
		// console.log('NO: ', z1_data[SUBSTANCE][i], z1_data[CAS][i])
		continue
	}

	allForms.add(form)

	function process_osha_pel(zcolum, unit) {
		let osha_pel = z1_data[zcolum][i]
		if(osha_pel) {
			if(!chemical.standards['osha_pel'].forms[form]) chemical.standards['osha_pel'].forms[form] = newForm('osha_pel')

			let durations = chemical.standards['osha_pel'].forms[form]

			for(let e of split(osha_pel)) {
				if(ceiling(e)) {
					durations.ceiling.values[unit] = ceiling(e)
				} 
				else if(stel(e)) {
					durations.stel.values[unit] = stel(e) 
				} 
				else if(Number(e)) {
					durations.default.values[unit] = e
				}
				else {
					// no duplicate notes
					if(chemical.standards['osha_pel'].notes.indexOf(e) == -1) chemical.standards['osha_pel'].notes.push(e)
				}
			}
		}
	}
	process_osha_pel(OSHA_PEL_PPM, 'ppm')
	process_osha_pel(OSHA_PEL_MGM3, 'mgm3')

	function process_combined_el_column(zcolumn, el_name) {

		let el = z1_data[zcolumn][i]
		if(el) {
			if(!chemical.standards[el_name].forms[form]) chemical.standards[el_name].forms[form] = newForm(el_name)

			let durations = chemical.standards[el_name].forms[form]

			for(let e of split(el)) {

				if(e == 'Ca') {
					chemical.standards[el_name].carcinogens = true
					continue
				}

				// breadth-last parse
				var unit, duration, duration_name = 'default'
				e = e

				// units
				.replace(/([0-9.,]+) ppm/g, (match, p1) => {
					unit = { ppm: p1 }
					return ''
				})
				.replace(/([0-9.,]+) mg\/m<sup>3<\/sup>/g, (match, p1) => {
					unit = { mgm3: p1 }
					return ''
				})

				// durations of exposure limits
				.replace(/\(C\)/g, () => {
					duration_name = 'ceiling'
					return ''
				})
				.replace(/\(ST\)/g, () => {
					duration_name = 'stel'
					return ''
				})
				.replace(/\[([0-9]+)[- ]min\]/g, (match, p1) => {
					duration = p1
					return ''
				})
				.replace(/\[([0-9]+)[- ]hr\]/g, (match, p1) => {
					duration = p1 * 60
					return ''
				})

				// console.log(durations[duration_name], duration_name)
				Object.assign(durations[duration_name].values, unit)
				if(duration) durations[duration_name].duration = duration

				if(e.trim() !== '') {
					// no duplicate notes
					if(chemical.standards[el_name].notes.indexOf(e) == -1) chemical.standards[el_name].notes.push(e)
				}

			}
		}
	}

	process_combined_el_column(CAL_OSHA_PEL, 'cal_osha_pel')
	process_combined_el_column(NIOSH_REL, 'niosh_rel')

}


// run ppm/mgm3 conversions
for(let chemical of chemical_output) {
	if(!chemical.one_ppm_in_mgm3) continue
	for(let standard in chemical.standards) {
		for(let form in chemical.standards[standard].forms) {
			for(let duration in chemical.standards[standard].forms[form]) {
				let dur = chemical.standards[standard].forms[form][duration]
				if(dur.ppm && !dur.mgm3) {
					dur.mgm3 = Math.round((dur.ppm * chemical.one_ppm_in_mgm3) * 100) / 100
				}
				else if(!dur.ppm && dur.mgm3) {
					dur.ppm = Math.round((dur.mgm3 / chemical.one_ppm_in_mgm3) * 100) / 100
				}
			}
		}
	}
}


// cleanup
for(let c of chemical_output) {
	for(let standard in c.standards) {
		for(let form in c.standards[standard].forms) {
			for(let duration in c.standards[standard].forms[form]) {
				let values = c.standards[standard].forms[form][duration].values
				if(values.ppm == 0) delete values.ppm
				if(values.mgm3 == 0) delete values.mgm3
				if(!values.ppm && !values.mgm3) delete c.standards[standard].forms[form][duration]
			}
			if(!Object.keys(c.standards[standard].forms[form]).length) delete c.standards[standard].forms[form]
		}
		if(!c.standards[standard].notes.length) {
			delete c.standards[standard].notes
		}
		if(!Object.keys(c.standards[standard].forms).length) {
			delete c.standards[standard].forms
			if(!c.standards[standard].notes) {
				delete c.standards[standard]
			}
		}
	}
}

// console.log(JSON.stringify(chemical_output[510], null, 2))
// console.log(chemical_output[510])

// for(let f of allForms) {
// 	console.log(f)
// }


// I know this seems hacky.  Sorting chemicals by name is pretty arbitrary, what with the alpha- 1,2,3- o- style prefixes.  I'm not going to build a hideous regex for this.  The data source is already mostly sorted alphabetically, so I'm just picking up on the existing order.
const letters = 'abcdefghiklmnopqrstuvwxyz'.split('') // no J chemicals
let letter = 0
let letterIndexes = {}

// link letter in navigation to first chemical that starts with it
for(let i = 0; i < chemical_output.length; i++) {
	let c = chemical_output[i]
	if(c.name.slice(0, 1).toLowerCase() === letters[letter] && c.name.slice(1, 2) !== '-') {
		letterIndexes[i] = letters[letter]
		letter++
	}
}

writeFileSync(joinPath(__dirname, '../client/data/chemicals.json'), JSON.stringify(chemical_output), 'utf8')
writeFileSync(joinPath(__dirname, '../client/data/letters.json'), JSON.stringify(letterIndexes), 'utf8')
