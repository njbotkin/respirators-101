
const { readFileSync } = require('fs')
const { join: joinPath } = require(`path`)

const { chemicals, newChemical } = require('./chemicals.js')
const { linkify, addNote } = require('./helpers.js')

function munge_exposure_limit(standard, chemical, n) {

	var carcinogens

	let { standards } = chemical

	// this one's easy
	if(n.slice(0, 3) === 'Ca ') {
		carcinogens = true
		n = n.slice(3)
	}

	var hold = []
	let try_general = true
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
		try_general = false
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

	if(try_general) {
		// sometimes not specified
		n = n.replace(/{([0-9])}( \({([0-9])}\))?( {_([0-9]+)_})?/g, (match, p1, p2, p3, p4, p5) => {
			if(p3) Object.assign(hold[p1], hold[p3])
			hold.push([ 'default', hold[p1], p5 ])
			return `{-${hold.length-1}-}`
		})
	}

	// forms of chemicals 

	// (as CrO<SUB>3</SUB>): {x}
	n = n.replace(/\(as ([^:]+)\):( {-[0-9]-})+/g, (match, p1) => {
		let form = chemical.addForm(p1)

		match.replace(/{-([0-9])-}/g, (match, p2) => {
			let dur = standards[standard].forms[form].durations[hold[p2][0]]
			Object.assign(dur.values, hold[p2][1])
			if(hold[p2][2]) dur.duration = hold[p2][2]
		})

		return ''
	})

	// {x} (as Cr)
	.replace(/({-[0-9]-} )+\(as ([^)]+)\)/g, (match, p1, p2) => {
		let form = chemical.addForm(p2)

		match.replace(/{-([0-9])-}/g, (match, p3) => {
			let dur = standards[standard].forms[form].durations[hold[p3][0]]
			Object.assign(dur.values, hold[p3][1])
			if(hold[p3][2]) dur.duration = hold[p3][2]
		})

		return ''
	})

	// Dust: {x}
	.replace(/([^:]+):( {-[0-9]-})+/g, (match, p1) => {
		let form = chemical.addForm(p1)

		match.replace(/{-([0-9])-}/g, (match, p2) => {
			let dur = standards[standard].forms[form].durations[hold[p2][0]]
			Object.assign(dur.values, hold[p2][1])
			if(hold[p2][2]) dur.duration = hold[p2][2]
		})

		return ''
	})

	// {x} (resp)
	.replace(/({-[0-9]-} )+\(([a-z ]+)\)/g, (match, p1, p2) => {
		let form = chemical.addForm(p2)

		match.replace(/{-([0-9])-}/g, (match, p3) => {
			let dur = standards[standard].forms[form].durations[hold[p3][0]]
			Object.assign(dur.values, hold[p3][1])
			if(hold[p3][2]) dur.duration = hold[p3][2]
		})

		return ''
	})

	// the rest of the durations belong to the default form
	.replace(/{-([0-9])-}/g, (match, p1) => {

		let form = chemical.addForm('default')

		let dur = standards[standard].forms[form].durations[hold[p1][0]]
		Object.assign(dur.values, hold[p1][1])
		if(hold[p1][2]) dur.duration = hold[p1][2]

		return ''
	})

	// convert back any leftover units
	.replace(/{([0-9])}/g, (match, p1) => {
		return hold[p1].ppm ? hold[p1].ppm + ' ppm' : hold[p1].mgm3 + ' mg/m3'
	})
	.replace(/{_([0-9]+)_}/g, (match, p1) => {
		return `[${p1}-minute]`
	})

	if(carcinogens) standards[standard].carcinogens = 1
	n = linkify(n.trim())
	if(n !== '') {
		addNote(standards[standard].notes, n)
	}
}

var chemical_source = JSON.parse(readFileSync(joinPath(__dirname, '../chemical-data/chemicals.json'), { encoding: `utf8` }))


for(let c of chemical_source.chemicals) {

	// if(c["cn"]) {
	// 	let filtered_cas = c["cn"].match(/[0-9-]+/)[0]
	// 	// cas_to_chemical[filtered_cas] = chemical_output.length
	// } 
	// if(c["c"]) name_to_chemical[c["c"]] = chemical_output.length

	let one_ppm_in_mgm3 = ''
	if(c["co"]) {
		let validConversion = c["co"].match(/1 ppm = ([0-9.]+) mg\/m<SUP>3<\/SUP>$/)
		if(validConversion) {
			one_ppm_in_mgm3 = validConversion[1]
		}
	}

	let idlh_split = c["i"].split('<br />')

	let chemical = newChemical({
		name: c["c"],
		synonyms: c["s"].join(', '),
		cas: c["cn"],
		// npg_link: 'https://www.cdc.gov/niosh/npg/npgd' + c["a"] + '.html',
		idlh: idlh_split.shift(),
		idlh_notes: linkify(idlh_split.join('<br />')),
		// niosh_rel: linkify(c["n"]),
		// osha_pel: linkify(c["o"]),
		physical_description: c["p"],
		exposure_routes: c["e"].charAt(0).toUpperCase() + c["e"].slice(1) + '.',
		target_organs: c["to"].charAt(0).toUpperCase() + c["to"].slice(1) + '.',
		eye: /eye/i.test(c["to"]) ? 1 : 0,
		one_ppm_in_mgm3,
		notes: '', // for ambiguous things
		ps: c["ps"] || "No recommendation",
		pe: c["pe"] || "No recommendation",
		pw: c["pw"] || "No recommendation",
		pr: c["pr"] || "No recommendation",
		pc: c["pc"] || "No recommendation",
		pp: c["pp"] || "No recommendation",
		npg: true
	})

	// super side affects ahoy, avert your eyes FPers
	munge_exposure_limit("niosh_rel", chemical, c["n"])
	munge_exposure_limit("osha_pel", chemical, c["o"])
} 

// manual fixes
chemicals['Mercury (organo) alkyl compounds (as Hg)'].cas = '7439-97-6'
