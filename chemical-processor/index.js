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

for(c of chemicals.chemicals) {
	chemical_output.push({
		c: c[NAME],
		s: c[SYNONYMS].join(', '),
		cn: c[CAS],
		npg: 'https://www.cdc.gov/niosh/npg/npgd' + c[NPG_ID] +'.html',
		i: c[IDLH],
		el: {
			NIOSH_REL: c[NIOSH_REL],
			OSHA_PEL: c[OSHA_PEL]
		},
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

writeFileSync(joinPath(__dirname, '../client/data/chemicals.js'), "export const chemicals = " + JSON.stringify(chemical_output), 'utf8')

// console.log(chemical_output)



// console.log(json)