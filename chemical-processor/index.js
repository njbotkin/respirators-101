/* 
	How this works:

		1) NPG gets added.
			Matched by name
		1) Table-Z1 gets added.  On conflict, NPG overwrites
			Provides name, CAS, and ELs
		3) Bring in manual data entry.  In contains manual corrections where the NPG data is either too obscure to bother importing, or is inconsistent.  Slso includes data from Tables z-2 and z-3.  It overwrites data found in the NPG.

*/

const { writeFileSync } = require('fs')
const { join: joinPath } = require(`path`)
let { chemicals } = require('./chemicals.js')


// STEP 1
require('./npg.js')

// STEP 2
require('./z1.js')

// STEP 3
require('./manual.js')


// run ppm/mgm3 conversions
for(let name in chemicals) {
	let c = chemicals[name]
	if(!c.one_ppm_in_mgm3) continue
	for(let standard in c.standards) {
		for(let form in c.standards[standard].forms) {
			for(let duration in c.standards[standard].forms[form].durations) {
				let dur = c.standards[standard].forms[form].durations[duration]
				if(dur.ppm && !dur.mgm3) {
					dur.mgm3 = Math.round((dur.ppm * c.one_ppm_in_mgm3) * 100) / 100
				}
				else if(!dur.ppm && dur.mgm3) {
					dur.ppm = Math.round((dur.mgm3 / c.one_ppm_in_mgm3) * 100) / 100
				}
			}
		}
	}
}


// cleanup
for(let name in chemicals) {
	let c = chemicals[name]

	for(let standard in c.standards) {
		for(let form in c.standards[standard].forms) {
			for(let duration in c.standards[standard].forms[form].durations) {
				let values = c.standards[standard].forms[form].durations[duration].values
				// if(values.ppm == 0) delete values.ppm
				// if(values.mgm3 == 0) delete values.mgm3
				// if(values.mg10m3 == 0) delete values.mg10m3
				if(!Object.keys(values).length && !c.standards[standard].forms[form].durations[duration].max) delete c.standards[standard].forms[form].durations[duration]
			}
			if(c.standards[standard].forms[form].notes) {
				for(let i = 0; i < c.standards[standard].forms[form].notes.length; i++) {
					if(c.standards[standard].forms[form].notes[i].trim() == '') c.standards[standard].forms[form].notes.splice(i, 1)
				}
				if(!c.standards[standard].forms[form].notes.length) {
					delete c.standards[standard].forms[form].notes
					if(!Object.keys(c.standards[standard].forms[form].durations).length) delete c.standards[standard].forms[form]
				}
			} 
		}
		if(c.standards[standard].notes && !c.standards[standard].notes.length) {
			delete c.standards[standard].notes
		}
		if(!Object.keys(c.standards[standard].forms).length) {
			delete c.standards[standard].forms
			if(!c.standards[standard].notes) {
				delete c.standards[standard]
			}
		}
	}
	if(!Object.values(c.standards).length) {
		console.log('NO ELs:', name)
		// delete chemicals[name]
	}
}

// make "ceiling" duration last
for(let name in chemicals) {
	let c = chemicals[name]
	for(let standard in c.standards) {
		for(let form in c.standards[standard].forms) {
			let durations = c.standards[standard].forms[form].durations
			if(durations['ceiling']) {
				let ceiling = durations['ceiling']
				delete durations['ceiling']
				durations['ceiling'] = ceiling
			}
		}
	}
}

// make "Default" state/form first
for(let name in chemicals) {
	let c = chemicals[name]
	for(let standard in c.standards) {
		if(c.standards[standard].forms && c.standards[standard].forms['Default']) {
			c.standards[standard].forms = Object.assign( { Default: c.standards[standard]['Default'] }, c.standards[standard].forms )
		}
	}
}

// sort by name
const chemicals_array = Object.values(chemicals).filter(c => c.name).map(c => c.serialize())
	.sort((a, b) => a.name.replace(/^[a-z,\-0-9'(]+/, '').localeCompare(b.name.replace(/^[a-z,\-0-9'(]+/, '')))

const letters = 'abcdefghiklmnopqrstuvwxyz'.split('') // no J chemicals
let letter = 0
let letterIndexes = {}

// link letter in navigation to first chemical that starts with it
let i = 0
for(let chemical of chemicals_array) {
	let clean = chemical.name.replace(/^[a-z,\-0-9'(]+/, '')
	if(clean.slice(0, 1).toLowerCase() === letters[letter]) {
		letterIndexes[i] = letters[letter]
		letter++
	}
	i++
}

// console.log(chemicals_array)

writeFileSync(joinPath(__dirname, '../client/data/chemicals.json'), JSON.stringify(chemicals_array), 'utf8')
writeFileSync(joinPath(__dirname, '../client/data/letters.json'), JSON.stringify(letterIndexes), 'utf8')
