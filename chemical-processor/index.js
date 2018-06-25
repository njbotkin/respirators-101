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

function munge_exposure_limit(standard, forms, n) {

	var carcinogens

	// this one's easy
	if(n.slice(0, 3) === 'Ca ') {
		carcinogens = true
		n = n.slice(3)
	}

	// breadth-last parse

	var units = []
	var types = []

	// units
	n = n.replace(/([0-9\.,]+) ppm/g, (match, p1) => {
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

	// types of exposure limits
	.replace(/TWA {([0-9])}( \({([0-9])}\))?/g, (match, p1, p2, p3) => {
		var el = units[p1]
		if(p3) el = Object.assign(units[p3], el)
		types.push({ regular: el })
		return '{{'+(types.length-1)+'}}'
	})
	.replace(/C {([0-9])}( \({([0-9])}\))?/g, (match, p1, p2, p3) => {
		var el = units[p1]
		if(p3) el = Object.assign(units[p3], el)
		types.push({ ceiling: el })
		return '{{'+(types.length-1)+'}}'
	})
	.replace(/ST {([0-9])}( \({([0-9])}\))?/g, (match, p1, p2, p3) => {
		var el = units[p1]
		if(p3) el = Object.assign(units[p3], el)
		types.push({ stel: el })
		return '{{'+(types.length-1)+'}}'
	})

	// forms of chemicals (format 1)
	.replace(/([^:]+):( {{[0-9]}})+/g, (match, p1) => {

		if(!forms[p1]) forms[p1] = {}
		if(!forms[p1][standard]) forms[p1][standard] = {}

		match.replace(/{{([0-9])}}/g, (match, p2) => {
			forms[p1][standard] = Object.assign(types[p2], forms[p1][standard])
		})

		return ''
	})

	// forms of chemicals (format 2)
	.replace(/({{[0-9]}} )+\(([a-z]+)\)/g, (match, p1, p2) => {
		
		if(!forms[p2]) forms[p2] = {}
		if(!forms[p2][standard]) forms[p2][standard] = {}

		match.replace(/{{([0-9])}}/g, (match, p3) => {
			forms[p2][standard] = Object.assign(types[p3], forms[p2][standard])
		})

		return ''
	})

	// the rest of the types belong to the regular form
	.replace(/{{([0-9])}}/g, (match, p1) => {

		if(!forms['regular']) forms['regular'] = {}
		if(!forms['regular'][standard]) forms['regular'][standard] = {}

		forms['regular'][standard] = Object.assign(types[p1], forms['regular'][standard])
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

	let chemical = {
		name: c["c"],
		synonyms: c["s"].join(', '),
		cas: c["cn"],
		npg: 'https://www.cdc.gov/niosh/npg/npgd' + c["a"] + '.html',
		idlh: linkify(c["i"]),
		niosh_rel: linkify(c["n"]),
		osha_pel: linkify(c["o"]),
		physical_description: c["p"],
		exposure_routes: c["e"],
		target_organs: c["to"],
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
	munge_exposure_limit("niosh_rel", chemical.forms, c["n"])
	munge_exposure_limit("osha_pel", chemical.forms, c["o"])

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
	if(!el.regular) el.regular = {}
	if(!el.ceiling) el.ceiling = {}
	if(!el.stel) el.stel = {}
	if(!el.notes) el.notes = []
	if(!el.znotes) el.znotes = []

	return el
}
function cleanupExposureLimit(el) {
	if(el.regular && Object.keys(el.regular).length === 0) delete el.regular
	if(el.ceiling && Object.keys(el.ceiling).length === 0) delete el.ceiling
	if(el.stel && Object.keys(el.stel).length === 0) delete el.stel
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
console.log(z1_data[CAS].length, chemical_output.length)
var found_by_cas = 0, found_by_name = 0, children = 0

for(let i = 0; i < all; i++) {
	let cas = z1_data[CAS][i].trim(), name = z1_data[SUBSTANCE][i].trim()

	var chemical, form, el

	// identify by CAS
	if(cas !== '' && cas_to_chemical[cas] !== undefined) {

		// console.log('CAS: ', z1_data[SUBSTANCE][i])

		found_by_cas++

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

		found_by_name++

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
		children++;
		chemical = parent
		form = z1_data[SUBSTANCE][i]
	}

	else {
		// nothing I can do for you
		// console.log('NO: ', z1_data[SUBSTANCE][i], z1_data[CAS][i])
		continue
	}

	if(form) {
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
				el.osha_pel.ceiling.ppm = ceiling(e)
			} 
			else if(stel(e)) {
				el.osha_pel.stel.ppm = stel(e) 
			} 
			else if(Number(e)) {
				el.osha_pel.regular.ppm = e
			}
			else {
				el.osha_pel.znotes.push(e)
			}
		}
	}

	let osha_pel_mgm3 = z1_data[OSHA_PEL_MGM3][i]
	if(osha_pel_mgm3) {
		el.osha_pel = fillOutExposureLimit(el.osha_pel)
		for(let e of split(osha_pel_mgm3)) {
			if(ceiling(e)) {
				el.osha_pel.ceiling.mgm3 = ceiling(e)
			} 
			else if(stel(e)) {
				el.osha_pel.stel.mgm3 = stel(e) 
			} 
			else if(Number(e)) {
				el.osha_pel.regular.mgm3 = e
			}
			else {
				el.osha_pel.znotes.push(e)
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
					el.cal_osha_pel.ceiling.ppm = ppm(ceiling(e))
				}
				else if(mgm3(ceiling(e))) {
					el.cal_osha_pel.ceiling.mgm3 = mgm3(ceiling(e))
				}
				else {
					console.log("WHAT",  cal_osha_pel)
				}
			}
			else if(stel(e)) {
				if(ppm(stel(e))) {
					el.cal_osha_pel.stel.ppm = ppm(stel(e))
				}
				else if(mgm3(stel(e))) {
					el.cal_osha_pel.stel.mgm3 = mgm3(stel(e))
				}
				else {
					console.log("WHAT",  cal_osha_pel)
				}
			} 
			else if(ppm(e)) {
				el.cal_osha_pel.regular.ppm = ppm(e)
			}
			else if(mgm3(e)) {
				el.cal_osha_pel.regular.mgm3 = mgm3(e)
			}
			else {
				el.cal_osha_pel.znotes.push(e)
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
					el.niosh_rel.ceiling.ppm = ppm(ceiling(e))
				}
				else if(mgm3(ceiling(e))) {
					el.niosh_rel.ceiling.mgm3 = mgm3(ceiling(e))
				}
				else {
					console.log("WHAT",  niosh_rel)
				}
			}
			else if(stel(e)) {
				if(ppm(stel(e))) {
					el.niosh_rel.stel.ppm = ppm(stel(e))
				}
				else if(mgm3(stel(e))) {
					el.niosh_rel.stel.mgm3 = mgm3(stel(e))
				}
				else {
					console.log("WHAT",  niosh_rel)
				}
			} 
			else if(ppm(e)) {
				el.niosh_rel.regular.ppm = ppm(e)
			}
			else if(mgm3(e)) {
				el.niosh_rel.regular.mgm3 = mgm3(e)
			}
			else if(carcinogens(e)) {
				el.niosh_rel.carcinogens = true
			}
			else {
				el.niosh_rel.znotes.push(e)
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
			for(let el_type in chemical.forms[form][el]) {
				let cet = chemical.forms[form][el][el_type]
				if(cet.ppm && !cet.mgm3) {
					cet.mgm3 = Math.round((cet.ppm * chemical.one_ppm_in_mgm3) * 100) / 100
				}
				else if(!cet.ppm && cet.mgm3) {
					cet.ppm = Math.round((cet.mgm3 / chemical.one_ppm_in_mgm3) * 100) / 100
				}
			}
		}
	}

}



// console.log(found_by_cas, found_by_name, children)

writeFileSync(joinPath(__dirname, '../client/data/chemicals.json'), JSON.stringify(chemical_output), 'utf8')
