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

function munge_exposure_limit(standard, chemical, n) {

	var carcinogens

	let { forms } = chemical

	// this one's easy
	if(n.slice(0, 3) === 'Ca ') {
		carcinogens = true
		n = n.slice(3)
	}

	// breadth-last parse

	var units = []
	var durations = []

	n = n

	// cleanup
	.replace('<BR>', '')
	.replace(/\[skin\]/g, function() {
		chemical.skin = true
		return ''
	})

	// units
	.replace(/([0-9\.,]+) ppm/g, (match, p1) => {
		units.push({
			ppm: p1
		})
		return '{'+(units.length-1)+'}'
	})
	.replace(/([0-9\.,]+) mg\/m<SUP>3<\/SUP>/g, (match, p1) => {
		units.push({
			mgm3: p1
		})
		return '{'+(units.length-1)+'}'
	})

	// durations of exposure limits
	.replace(/TWA {([0-9])}( \({([0-9])}\))?/g, (match, p1, p2, p3) => {
		var el = units[p1]
		if(p3) el = Object.assign(units[p3], el)
		durations.push({ regular: el })
		return '{{'+(durations.length-1)+'}}'
	})
	.replace(/C {([0-9])}( \({([0-9])}\))?/g, (match, p1, p2, p3) => {
		var el = units[p1]
		if(p3) el = Object.assign(units[p3], el)
		durations.push({ ceiling: el })
		return '{{'+(durations.length-1)+'}}'
	})
	.replace(/ST {([0-9])}( \({([0-9])}\))?/g, (match, p1, p2, p3) => {
		var el = units[p1]
		if(p3) el = Object.assign(units[p3], el)
		durations.push({ stel: el })
		return '{{'+(durations.length-1)+'}}'
	})

	// forms of chemicals (format 1)
	.replace(/([^:]+):( {{[0-9]}})+/g, (match, p1) => {

		if(p1.trim() == 'Vapor') p1 = 'regular'
		if(p1.trim() == 'Hg Vapor') p1 = 'regular'
		if(p1.trim() == 'Dust') p1 = 'dust'
		if(p1.trim() == 'Other') p1 = 'other'

		if(!forms[p1]) forms[p1] = {}
		if(!forms[p1][standard]) forms[p1][standard] = {}
		if(!forms[p1][standard].durations) forms[p1][standard].durations = {}

		match.replace(/{{([0-9])}}/g, (match, p2) => {
			forms[p1][standard].durations = Object.assign(durations[p2], forms[p1][standard].durations)
		})

		return ''
	})

	// forms of chemicals (format 2)
	.replace(/({{[0-9]}} )+\(([a-z]+)\)/g, (match, p1, p2) => {
		
		if(!forms[p2]) forms[p2] = {}
		if(!forms[p2][standard]) forms[p2][standard] = {}
		if(!forms[p2][standard].durations) forms[p2][standard].durations = {}

		match.replace(/{{([0-9])}}/g, (match, p3) => {
			forms[p2][standard].durations = Object.assign(durations[p3], forms[p2][standard].durations)
		})

		return ''
	})

	// the rest of the durations belong to the regular form
	.replace(/{{([0-9])}}/g, (match, p1) => {

		if(!forms['regular']) forms['regular'] = {}
		if(!forms['regular'][standard]) forms['regular'][standard] = {}
		if(!forms['regular'][standard].durations) forms['regular'][standard].durations = {}

		forms['regular'][standard].durations = Object.assign(durations[p1], forms['regular'][standard].durations)
		return ''
	})

	n = linkify(n)

	// the rest is notes.  It's ambiguous which form/el the notes belong to, so add it to all of them
	if(Object.keys(forms).length > 0) {
		for(var formName in forms) {
			if(forms[formName][standard]) {
				if(carcinogens) forms[formName][standard].carcinogens = carcinogens
				if(n.trim()) forms[formName][standard].notes = [n]
			} else {
				forms[formName][standard] = { notes: [n] }
			}
		}
	} else {
		forms['regular'] = {}
		forms['regular'][standard] = { notes: [n] }
	}

}

for(var c of chemicals.chemicals) {

	if(c["cn"]) {
		let filtered_cas = c["cn"].match(/[0-9\-]+/)[0]
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
		niosh_rel: linkify(c["n"]),
		osha_pel: linkify(c["o"]),
		physical_description: c["p"],
		exposure_routes: c["e"],
		target_organs: c["to"],
		eye: /eye/i.test(c["to"]) ? 1 : 0,
		one_ppm_in_mgm3,
		forms: {},
		notes: '', // for ambiguous things

		ps: c["ps"],
		pe: c["pe"],
		pw: c["pw"],
		pr: c["pr"],
		pc: c["pc"],
		pp: c["pp"]
	}

	// console.log(c["n"], c["cn"])

	// super side affects ahoy, avert your eyes FPers
	munge_exposure_limit("niosh_rel", chemical, c["n"])
	munge_exposure_limit("osha_pel", chemical, c["o"])

	// console.log(chemical.forms)
	// console.log(chemical.forms[0].niosh_rel)

	chemical_output.push(chemical)
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
function ppm(s) {
	let match = s.match(/([0-9\.,]+) ppm/)
	if(match) return match[1].replace(/\,/g,'')
}
function mgm3(s) {
	let match = s.match(/([0-9\.,]+) mg\/m<sup>3<\/sup>/)
	if(match) return match[1].replace(/\,/g,'')
}
function carcinogens(s) {
	return s === 'Ca'
}

function fillOutExposureLimit(el) {
	if(!el) el = {}
	if(!el.durations) el.durations = {}
	if(!el.durations.regular) el.durations.regular = {}
	if(!el.durations.ceiling) el.durations.ceiling = {}
	if(!el.durations.stel) el.durations.stel = {}
	if(!el.notes) el.notes = []
	if(!el.znotes) el.znotes = []

	return el
}
function cleanupExposureLimit(el) {
	if(el.durations && Object.keys(el.durations).length === 0) {
		delete el.durations
	} else if(el.durations) {
		if(el.durations.regular && Object.keys(el.durations.regular).length === 0) delete el.durations.regular
		if(el.durations.ceiling && Object.keys(el.durations.ceiling).length === 0) delete el.durations.ceiling
		if(el.durations.stel && Object.keys(el.durations.stel).length === 0) delete el.durations.stel	
	}
	if(el.notes && el.notes.length === 0) delete el.notes
	if(el.znotes && el.znotes.length === 0) delete el.znotes
	if(Object.keys(el).length === 0) el = null
	return el
}

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

	var chemical, form, el

	// identify by CAS
	if(cas !== '' && cas_to_chemical[cas] !== undefined) {

		// console.log('CAS: ', z1_data[SUBSTANCE][i])

		// found_by_cas++

		chemical = chemical_output[cas_to_chemical[cas]]
		form = null

		if(cas_headers.indexOf(cas) > -1) {
			parent = chemical
			continue
		} else {
			parent = null
		}
	} 

	// identify by name
	else if(name !== '' && name_to_chemical[name] !== undefined) {

		// console.log('NAME: ', z1_data[SUBSTANCE][i])

		// found_by_name++

		chemical = chemical_output[name_to_chemical[name]]
		form = null

		if(name_headers.indexOf(name) > -1) {
			parent = chemical
			continue
		} else {
			parent = null
		}
	}

	// child ELs
	else if(parent) {
		// children++;
		chemical = parent
		form = z1_data[SUBSTANCE][i]
	}

	else {
		// nothing I can do for you
		// console.log('NO: ', z1_data[SUBSTANCE][i], z1_data[CAS][i])
		continue
	}

	if(form) {

		// normalize form name
		if(form == 'Total dust') form = 'total'
		if(form == 'Respirable fraction') form = 'resp'

		if(!chemical.forms[form]) chemical.forms[form] = {}
		el = chemical.forms[form]
		// el = {
		// 	form,
		// 	osha_pel: fillOutExposureLimit(),
		// 	niosh_rel: fillOutExposureLimit(),
		// 	cal_osha_pel: fillOutExposureLimit()
		// }
		// chemical.forms.push(el) 
	} else {
		if(!chemical.forms["regular"]) chemical.forms["regular"] = {}
		el = chemical.forms['regular']
	}


	let osha_pel_ppm = z1_data[OSHA_PEL_PPM][i]
	if(osha_pel_ppm) {
		el.osha_pel = fillOutExposureLimit(el.osha_pel)
		for(let e of split(osha_pel_ppm)) {
			if(ceiling(e)) {
				el.osha_pel.durations.ceiling.ppm = ceiling(e)
			} 
			else if(stel(e)) {
				el.osha_pel.durations.stel.ppm = stel(e) 
			} 
			else if(Number(e)) {
				el.osha_pel.durations.regular.ppm = e
			}
			else {
				// no duplicate notes
				if(el.osha_pel.znotes.indexOf(e) == -1) el.osha_pel.znotes.push(e)
			}
		}
	}

	let osha_pel_mgm3 = z1_data[OSHA_PEL_MGM3][i]
	if(osha_pel_mgm3) {
		el.osha_pel = fillOutExposureLimit(el.osha_pel)
		for(let e of split(osha_pel_mgm3)) {
			if(ceiling(e)) {
				el.osha_pel.durations.ceiling.mgm3 = ceiling(e)
			} 
			else if(stel(e)) {
				el.osha_pel.durations.stel.mgm3 = stel(e) 
			} 
			else if(Number(e)) {
				el.osha_pel.durations.regular.mgm3 = e
			}
			else {
				if(el.osha_pel.znotes.indexOf(e) == -1) el.osha_pel.znotes.push(e)
			}
		}
	}

	if(el.osha_pel) el.osha_pel = cleanupExposureLimit(el.osha_pel)

	let cal_osha_pel = z1_data[CAL_OSHA_PEL][i]
	if(cal_osha_pel) {
		el.cal_osha_pel = fillOutExposureLimit(el.cal_osha_pel)
		for(let e of split(cal_osha_pel)) {
			if(ceiling(e)) {
				if(ppm(ceiling(e))) {
					el.cal_osha_pel.durations.ceiling.ppm = ppm(ceiling(e))
				}
				else if(mgm3(ceiling(e))) {
					el.cal_osha_pel.durations.ceiling.mgm3 = mgm3(ceiling(e))
				}
				else {
					// console.log("WHAT",  cal_osha_pel)
				}
			}
			else if(stel(e)) {
				if(ppm(stel(e))) {
					el.cal_osha_pel.durations.stel.ppm = ppm(stel(e))
				}
				else if(mgm3(stel(e))) {
					el.cal_osha_pel.durations.stel.mgm3 = mgm3(stel(e))
				}
				else {
					// console.log("WHAT",  cal_osha_pel)
				}
			} 
			else if(ppm(e)) {
				el.cal_osha_pel.durations.regular.ppm = ppm(e)
			}
			else if(mgm3(e)) {
				el.cal_osha_pel.durations.regular.mgm3 = mgm3(e)
			}
			else {
				if(el.cal_osha_pel.znotes.indexOf(e) == -1) el.cal_osha_pel.znotes.push(e)
			}
		}
	}

	if(el.cal_osha_pel) el.cal_osha_pel = cleanupExposureLimit(el.cal_osha_pel)

	let niosh_rel = z1_data[NIOSH_REL][i]
	if(niosh_rel) {
		el.niosh_rel = fillOutExposureLimit(el.niosh_rel)
		for(let e of split(niosh_rel)) {
			if(ceiling(e)) {
				if(ppm(ceiling(e))) {
					el.niosh_rel.durations.ceiling.ppm = ppm(ceiling(e))
				}
				else if(mgm3(ceiling(e))) {
					el.niosh_rel.durations.ceiling.mgm3 = mgm3(ceiling(e))
				}
				else {
					console.log("WHAT",  niosh_rel)
				}
			}
			else if(stel(e)) {
				if(ppm(stel(e))) {
					el.niosh_rel.durations.stel.ppm = ppm(stel(e))
				}
				else if(mgm3(stel(e))) {
					el.niosh_rel.durations.stel.mgm3 = mgm3(stel(e))
				}
				else {
					console.log("WHAT",  niosh_rel)
				}
			} 
			else if(ppm(e)) {
				el.niosh_rel.durations.regular.ppm = ppm(e)
			}
			else if(mgm3(e)) {
				el.niosh_rel.durations.regular.mgm3 = mgm3(e)
			}
			else if(carcinogens(e)) {
				el.niosh_rel.carcinogens = true
			}
			else {
				if(el.niosh_rel.znotes.indexOf(e) > -1) el.niosh_rel.znotes.push(e)
			}
		}
	} 

	if(el.niosh_rel) el.niosh_rel = cleanupExposureLimit(el.niosh_rel)

	// console.log(el)

		// console.log(chemical_output[cas_to_chemical[cas]])

		// console.log(cas)
}


// run ppm/mgm3 conversions

for(let chemical of chemical_output) {

	if(!chemical.one_ppm_in_mgm3) continue

	for(let form in chemical.forms) {
		for(let el in chemical.forms[form]) {
			for(let duration in chemical.forms[form][el].durations) {
				let cfed = chemical.forms[form][el].durations[duration]
				if(cfed.ppm && !cfed.mgm3) {
					cfed.mgm3 = Math.round((cfed.ppm * chemical.one_ppm_in_mgm3) * 100) / 100
				}
				else if(!cfed.ppm && cfed.mgm3) {
					cfed.ppm = Math.round((cfed.mgm3 / chemical.one_ppm_in_mgm3) * 100) / 100
				}
			}
		}
	}

}

// set exposure limit durations in minutes
// const durations = {
// 	osha_pel: {
// 		regular: 8 * 60,
// 		ceiling: 8 * 60,
// 		stel: 15
// 	},
// 	cal_osha_pel: {
// 		regular: 8 * 60,
// 		ceiling: 8 * 60,
// 		stel: 15
// 	},
// 	niosh_rel: {
// 		regular: 10 * 60,
// 		ceiling: 10 * 60,
// 		stel: 15
// 	}
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

// console.log(JSON.stringify(chemical_output[379]))

// console.log(found_by_cas, found_by_name, children)

writeFileSync(joinPath(__dirname, '../client/data/chemicals.json'), JSON.stringify(chemical_output), 'utf8')
writeFileSync(joinPath(__dirname, '../client/data/letters.json'), JSON.stringify(letterIndexes), 'utf8')
