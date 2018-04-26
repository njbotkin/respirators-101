const { readFileSync, writeFileSync } = require('fs')
const { join: joinPath } = require(`path`)

var chemicals = JSON.parse(readFileSync(joinPath(__dirname, '../chemical-data/chemicals.json'), { encoding: `utf8` }))

var chemical_output = []

// KEYS
const NPG_ID = "a",
	NAME = "c",
	CAS = "cn",
	FORMULA = "f",
	SYNONYMS = "s",
	DOT_ID_AND_GUIDE = "d",
	NIOSH_REL = "n",
	OSHA_PEL = "o",
	MEASUREMENT_METHODS = "m",
	IDLH = "i",
	CONVERSION = "co",
	PHYSICAL_DESCRIPTION = "p",
	EXPOSURE_ROUTES = "e",
	TARGET_ORGANS = "to"

// fix links, link appendices, etc 
function linkify(s) {
	return s.replace(/Appendix ([a-zA-Z])/g, (match, p1, offset, string) => {
		return '<a href="https://www.cdc.gov/niosh/npg/nengapdx' + p1.toLowerCase() + '.html">' + match + '</a>'
	})
	.replace(/<a href='#' external data-url='([^']+)'>/g, (match, p1, offset, string) => {
		return '<a href="' + p1 + '">'
	})
}

for(c of chemicals.chemicals) {
	chemical_output.push({
		c: c[NAME],
		s: c[SYNONYMS].join(', '),
		cn: c[CAS],
		npg: 'https://www.cdc.gov/niosh/npg/npgd' + c[NPG_ID] +'.html',
		i: linkify(c[IDLH]),
		n: linkify(c[NIOSH_REL]),
		o: linkify(c[OSHA_PEL]),
		p: c[PHYSICAL_DESCRIPTION],
		e: c[EXPOSURE_ROUTES],
		to: c[TARGET_ORGANS],

		ps: c["ps"],
		pe: c["pe"],
		pw: c["pw"],
		pr: c["pr"],
		pc: c["pc"],
		pp: c["pp"]
	})
}

writeFileSync(joinPath(__dirname, '../client/data/chemicals.json'), JSON.stringify(chemical_output), 'utf8')

// console.log(chemical_output)



// console.log(json)