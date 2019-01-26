
const { readFileSync } = require('fs')
const { join: joinPath } = require(`path`)
const cheerio = require('cheerio')
const cheerioTableparser = require('./tableparser.js')
const striptags = require('striptags');
const Entities = require('html-entities').AllHtmlEntities;
const entities = new Entities();

const { newChemical, chemicals } = require('./chemicals.js')
const { addNote } = require('./helpers.js')

const $ = cheerio.load(readFileSync(joinPath(__dirname, '../chemical-data/z1.html'), { encoding: `utf8` }))
cheerioTableparser($)

let z1_data = $("#z-1").parsetable(3)

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

function link_gs(s) {
	return `<a href="https://www.osha.gov/laws-regs/regulations/standardnumber/${ s.slice(0, 4) }/${ s.replace(/\([a-z]\)/, '') }#${ s }">${s}</a>`
}

function process_osha_pel({osha_pel, chemical, form, unit}) {
	let { durations } = chemical.standards['osha_pel'].forms[form]

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
			addNote(chemical.standards['osha_pel'].notes, e)
		}
	}
}

function process_combined_el_column({el, chemical, form, el_name}) {
	let { durations } = chemical.standards[el_name].forms[form]

	for(let e of split(striptags(el, ['sup', 'br']))) {

		if(e == 'Ca') {
			chemical.standards[el_name].carcinogens = true
			continue
		}

		// breadth-last parse
		let unit, duration, duration_name = 'default'
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
		.replace(/([0-9.,]+) mg\/m3/g, (match, p1) => {
			unit = { mgm3: p1 }
			return ''
		})
		.replace(/([0-9.,]+) f\/cm<sup>3<\/sup>/g, (match, p1) => {
			unit = { fcm3: p1 }
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

		Object.assign(durations[duration_name].values, unit)
		if(duration) durations[duration_name].duration = duration

		addNote(chemical.standards[el_name].notes, e)

	}
}

function parse_ELs(row, chemical, form) {

	if(!empty(row.cells[OSHA_PEL_PPM]) || !empty(row.cells[OSHA_PEL_MGM3])) {
		if(!empty(row.cells[OSHA_PEL_PPM])) {
			process_osha_pel({osha_pel: row.cells[OSHA_PEL_PPM].content, chemical, form, unit: 'ppm'})
		}
		if(!empty(row.cells[OSHA_PEL_MGM3])) {
			process_osha_pel({osha_pel: row.cells[OSHA_PEL_MGM3].content, chemical, form, unit: 'mgm3'})
		}
	}

	if(!empty(row.cells[CAL_OSHA_PEL])) {
		process_combined_el_column({el: row.cells[CAL_OSHA_PEL].content, chemical, form, el_name:'cal_osha_pel'})
	}
	if(!empty(row.cells[NIOSH_REL])) {
		process_combined_el_column({el: row.cells[NIOSH_REL].content, chemical, form, el_name:'niosh_rel'})
	}
}

const empty = cell => cell.content == '' || cell.content == 'See Annotated Z-2' || cell.content == 'See Annotated Z-3' || cell.content == '........'


const SUBSTANCE = 0,
	CAS = 1,
	OSHA_PEL_PPM = 2,
	OSHA_PEL_MGM3 = 3,
	CAL_OSHA_PEL = 4,
	NIOSH_REL = 5

// manual corrections go here.  The data is not very consistent.
const move = [
	{
		id: row => row.cells[SUBSTANCE].content == 'Zinc oxide fume',
		remove: true,
		transform: row => { row.cells[SUBSTANCE].classes = "indent"; row.cells[SUBSTANCE].content = 'Fume' },
		to: row => row.cells[SUBSTANCE].content == 'Zinc oxide'
	},
	{
		id: row => row.cells[SUBSTANCE].content == 'Magnesium oxide fume - Total Particulate',
		remove: true,
		transform: row => { 
			let chemical = newChemical({
				name: 'Magnesium oxide fume',
				cas: row.cells[CAS].content.trim(),
				z1: true,
			})
			let form = chemical.addForm('Total Particulate')
			parse_ELs(row, chemical, form)
		}
	},
	{
		id: row => row.cells[SUBSTANCE].content == 'Uranium (as U)',
		remove: true,
		transform: (row, index) => { 
			z1_data[index+1].cells[SUBSTANCE] = {
				content: 'Uranium (soluble compounds, as U)',
				classes: ''
			}
			z1_data[index+1].cells[CAS] = z1_data[index].cells[CAS]

			z1_data[index+2].cells[SUBSTANCE] = {
				content: 'Uranium (insoluble compounds, as U)',
				classes: ''
			}
			z1_data[index+2].cells[CAS] = z1_data[index].cells[CAS]
		}
	},
	{
		id: row => row.cells[CAS].content == '106-99-0',
		remove: true,
		transform: row => { 
			let chemical = newChemical({
				name: '1,3-Butadiene',
				cas: row.cells[CAS].content.trim(),
				z1: true,
			})
			row.cells[OSHA_PEL_PPM].content = '' // screw you, the NPG does it better
			chemical.general_standard = [link_gs('1910.1051'), link_gs('1910.19(l)')]
			let form = chemical.addForm('default')
			parse_ELs(row, chemical, form)
		}
	},
	{
		id: row => row.cells[CAS].content == '65966-93-2',
		transform: row => { 
			row.cells[NIOSH_REL].content = '' // screw you, the NPG does it better
			row.cells[OSHA_PEL_MGM3].content = '' // screw you, the NPG does it better
		}
	},
	{
		id: row => row.cells[CAS].content == '71-43-2',
		transform: row => { row.cells[SUBSTANCE].content = 'Benzene; See 1910.1028' }
	},
	{
		id: row => row.cells[SUBSTANCE].content == '<strong>Silica, crystalline, respirable dust</strong>',
		transform: row => { row.cells[SUBSTANCE].content = 'Silica, crystalline (as respirable dust)' }
	},
	{
		id: row => row.cells[SUBSTANCE].content == 'Platinum (as Pt) Metal',
		transform: (row, index) => { 
			row.classes = ''
			row.cells[SUBSTANCE].content = 'Platinum'

			z1_data[index+1].cells[SUBSTANCE] = {
				content: 'Platinum (soluble salts, as Pt)',
				classes: ''
			}
		}
	},
	{
		id: row => row.cells[CAS].content == '1189-85-1',
		transform: (row) => { 
			row.cells[NIOSH_REL].content = row.cells[NIOSH_REL].content.replace('Ca<br>0.001 mg/m<sup>3</sup> CR (VI)', '')
		}
	},

	{
		id: row => row.cells[SUBSTANCE].content == 'Silicates (less than 1% crystalline silica)',
		remove: true
	},
	
	{
		id: row => row.cells[SUBSTANCE].content == 'Dinitrobenzene (all isomers)',
		transform: (row, index) => { 
			for(let i = 1; i <= 3; i++) {
				z1_data[index+i].cells[SUBSTANCE].classes = ''
				z1_data[index+i].cells[OSHA_PEL_MGM3].content = z1_data[index].cells[OSHA_PEL_MGM3].content
				z1_data[index+i].cells[CAL_OSHA_PEL].content = z1_data[index].cells[CAL_OSHA_PEL].content
				z1_data[index+i].cells[NIOSH_REL].content = z1_data[index].cells[NIOSH_REL].content
			}
		},
		remove: true,
	},
	{
		id: row => row.cells[CAS].content == '528-29-0',
		transform: row => row.cells[SUBSTANCE].content = 'o-Dinitrobenzene'
	},
	{
		id: row => row.cells[CAS].content == '99-65-0',
		transform: row => row.cells[SUBSTANCE].content = 'm-Dinitrobenzene'
	},
	{
		id: row => row.cells[CAS].content == '100-25-4',
		transform: row => row.cells[SUBSTANCE].content = 'p-Dinitrobenzene'
	},

	{
		id: row => row.cells[SUBSTANCE].content == 'Nitrotoluene (all isomers)',
		transform: (row, index) => { 
			for(let i = 1; i <= 3; i++) {
				z1_data[index+i].cells[SUBSTANCE].classes = ''
				z1_data[index+i].cells[OSHA_PEL_MGM3].content = z1_data[index].cells[OSHA_PEL_MGM3].content
				z1_data[index+i].cells[CAL_OSHA_PEL].content = z1_data[index].cells[CAL_OSHA_PEL].content
				z1_data[index+i].cells[NIOSH_REL].content = z1_data[index].cells[NIOSH_REL].content
			}
		},
		remove: true,
	},
	{
		id: row => row.cells[CAS].content == '88-72-2',
		transform: row => row.cells[SUBSTANCE].content = 'o-Nitrotoluene'
	},
	{
		id: row => row.cells[CAS].content == '99-08-1',
		transform: row => row.cells[SUBSTANCE].content = 'm-Nitrotoluene'
	},
	{
		id: row => row.cells[CAS].content == '99-99-0',
		transform: row => row.cells[SUBSTANCE].content = 'p-Nitrotoluene'
	},

	{
		id: row => row.cells[CAS].content == '14808-60-7',
		transform: row => row.cells[SUBSTANCE].content = row.cells[SUBSTANCE].content.replace(':', ';')
	},

	{
		id: row => row.cells[SUBSTANCE].content == 'Copper',
		remove: true,
		transform: (row, index) => { 
			z1_data[index+1].cells[SUBSTANCE] = {
				content: 'Copper fume (as Cu)',
				classes: ''
			}
			z1_data[index+2].cells[SUBSTANCE] = {
				content: 'Copper (dusts and mists, as Cu)',
				classes: ''
			}
		}
	},
]

for(let m of move) {
	let index = z1_data.findIndex(m.id)
	if(index == -1) {
		console.log('couldnt find ' + m.id.toString())
		continue
	}
	let row = z1_data[index]

	if(m.transform) m.transform(row, index)
	if(m.remove) z1_data.splice(index, 1)
	if(m.to) {
		let to_index = z1_data.findIndex(m.to)
		z1_data.splice(to_index + 1, 0, row)
	}
}


// line up with the NPG
let rename = {
	'Tin, organic compounds (as Sn)': 'Tin (organic compounds, as Sn)',
	'Tetramethyl lead, (as Pb)': 'Tetramethyl lead (as Pb)',
	'Tantalum, metal and oxide dust': 'Tantalum (metal and oxide dust, as Ta)',
	'Silver, metal and soluble compounds (as Ag)': 'Silver (metal dust and soluble compounds, as Ag)',
	'Selenium compounds (as Se)': 'Selenium',
	'Rhodium (as Rh), metal fume and insoluble compounds': 'Rhodium (metal fume and insoluble compounds, as Rh)',
	'Rhodium (as Rh), soluble compounds': 'Rhodium (soluble compounds, as Rh)',
	'Petroleum distillates (Naphtha) (Rubber Solvent)': 'Petroleum distillates (naphtha)',
	'Phenyl ether, vapor': 'Phenyl ether (vapor)',
	'Phenyl ether-biphenylmixture, vapor': 'Phenyl ether-biphenyl mixture (vapor)',
	'Oil mist, mineral': 'Oil mist (mineral)',
	'Particulates Not Otherwise Regulated (PNOR)(i)': 'Particulates not otherwise regulated',
	'4-Nitrodiphenyl; see 1910.1003': '4-Nitrobiphenyl; see 1910.1003',
	'Nitroglycerin': 'Nitroglycerine',
	'Naphtha (Coal tar)': 'Naphtha (coal tar)',
	'Grain dust (oat, wheat barley)': 'Grain dust (oat, wheat, barley)',
	'Di-sec octyl phthalate (Di-(2-ethylhexyl) phthalate)': 'Di-sec octyl phthalate',
	'4-Dimethylaminoazo-benzene; see 1910.1015': '4-Dimethylaminoazobenzene; see 1910.1015',
	'Dimethyl-1,2-dibromo-2,2-dichloroethylphosphate': 'Dimethyl-1,2-dibromo-2,2-dichlorethyl phosphate',
	'1,3-Dichloro-5,5-dimethyl hydantoin': '1,3-Dichloro-5,5-dimethylhydantoin',
	'Crag herbicide (Sesone)': 'Crag® herbicide',
	'2-Chloro-6-(trichloromethyl)pyridine': '2-Chloro-6-trichloromethyl pyridine',
	'Cobalt metal, dust, and fume (as Co)': 'Cobalt metal dust and fume (as Co)',
	'Camphor, synthetic': 'Camphor (synthetic)',
	'Calcium Carbonate': 'Calcium carbonate',
	'n-Butyl-acetate': 'n-Butyl acetate',
	'Bismuth telluride, Undoped': 'Bismuth telluride, undoped',
	'Aniline and homologs': 'Aniline (and homologs)',
	'Arsenic, inorganic compounds (as As) see 1910.1018': 'Arsenic (inorganic compounds, as As); see 1910.1018',
	'Arsenic, organic compounds (as As)': 'Arsenic (organic compounds, as As)',
	'Plaster of paris': 'Plaster of Paris',
	'4,4&apos;-Thiobis (6-tert,Butyl-m-cresol)': "4,4'-Thiobis(6-tert-butyl-m-cresol)",
	'Coal tar pitch volatiles (benzene soluble fraction), anthracene, BaP, phenanthrene, acridine, chrysene, pyrene)': 'Coal tar pitch volatiles',
	'Iron oxide': 'Iron oxide (as Fe)',
	'2-Methoxyethanol; (Methyl cellosolve)': 'Methyl Cellosolve®',
	'Vanadium': 'Vanadium fume (as V<sub>2</sub>O<sub>5</sub>)',
	'Tin, inorganic compounds (except oxides) (as Sn)': 'Tin',
	'Thallium, soluble compounds (as Tl)': 'Thallium (soluble compounds, as Tl)',
	'2-Methoxyethyl acetate (Methyl cellosolve acetate)': 'Methyl Cellosolve® acetate',
	'Graphite, synthetic': 'Graphite (synthetic)',
	'Chromium (II) compounds (as Cr)': 'Chromium(II) compounds (as Cr) ',
	'Chromium (III) compounds (as Cr)': 'Chromium(III) compounds (as Cr) ',
	'Nickel, metal and insoluble compounds (as Ni)': 'Nickel metal and other compounds (as Ni)',
}

for(let r in rename) {
	let index = z1_data.findIndex(row => striptags(row.cells[SUBSTANCE].content) === r)
	if(index == -1) {
		console.log('couldnt find ' +r)
		continue
	}
	z1_data[index].cells[SUBSTANCE].content = rename[r]
}

let skip = [
	'Ethylene oxide',
	'Chromium (VI) compounds',
	'Iron oxide (as Fe)',
	'Titanium dioxide - Total dust',
	'Respirable dust (as V<sub>2</sub>O<sub>5</sub>)',
	'Vanadium',
	'Fume (as V<sub>2</sub>O<sub>5</sub>)',
	'Tin',
	'Nitroglycerine',
	'Carbon black',
	'Nickel metal and other compounds (as Ni)'
]

let parent = null

for(let row of z1_data) {

	let chemical, form, general_standard
	let name = row.cells[SUBSTANCE].content
	let cas = row.cells[CAS].content.trim()

	name = entities.decode(striptags(name.trim(), '<sub>'))

	// pull out general standard
	.replace(/(see ([0-9]{4}\.[0-9]{4}))/ig, (match, p1, p2) => {
		general_standard = p2
		return ''
	})

	// pull out general standard
	// .replace(/(see [0-9]{4}\.[0-9]{4})/ig, (match, p1, p2) => {
	// 	general_standard = p2
	// 	return ''
	// })

	// cull footnotes
	.replace(/(\([a-z]\))/g, '')

	// cull stuff after ;
	if(name.indexOf(';') > -1) name = name.slice(0, name.indexOf(';')) 
	name = name.trim()

	// remove trailing comma
	if(name[name.length-1] == ',') {
		name = name.slice(0, name.length-1)
		// console.log(name)
	}
		
	// many of the names in Z-1 will line up with the NPG if we remove some parens
	if(!chemicals[name]) {
		if(name.indexOf("(") > -1) {
			let parens
			let modified_name = name.replace(/\(([^(]+)\)/, (match, p1) => {
				parens = p1
				return ''
			}).trim()
			if(chemicals[modified_name] && chemicals[modified_name].cas === cas) {
				name = modified_name
			}
			else if(chemicals[parens] && chemicals[parens].cas === cas) {
				name = parens
			}
		}
	}
	// if(name.indexOf("(") > -1) {
	// 	console.log(name)
	// }


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

	// is a parent
	if(row.classes == 'headingRow') {
		chemical = newChemical({
			name,
			cas,
			z1: true,
		})
		parent = chemical

		if(!empty(row.cells[CAL_OSHA_PEL])) {
			addNote(chemical.standards["cal_osha_pel"].notes, row.cells[CAL_OSHA_PEL].content)
		}
		if(!empty(row.cells[NIOSH_REL])) {
			addNote(chemical.standards["niosh_rel"].notes, row.cells[NIOSH_REL].content)
		}

		continue
	} else if(parent && row.cells[SUBSTANCE].classes == 'indent') {
		chemical = parent
		form = chemical.addForm(name)

		if(general_standard) {
			for(let standard in chemical.standards) {
				addNote(chemical.standards[standard].forms[form].notes, 'see ' + link_gs(general_standard))
			}
		}
	} else {
		parent = null

		if(name == '') continue

		// skip if no ELs
		if(empty(row.cells[OSHA_PEL_PPM]) && empty(row.cells[OSHA_PEL_MGM3]) && empty(row.cells[CAL_OSHA_PEL]) && empty(row.cells[NIOSH_REL])) {
			// console.log('EMPTY: ', name)
			continue
		}

		chemical = newChemical({
			name,
			cas,
			cal_osha_pel: row.cells[CAL_OSHA_PEL].content,
			z1: true,
		})
		if(general_standard) chemical.general_standard = [link_gs(general_standard)]
		form = chemical.addForm('default')
	}

	if(skip.indexOf(name) > -1) continue;

	parse_ELs(row, chemical, form)

}

chemicals['Uranium (soluble compounds, as U)'].standards.niosh_rel.notes = chemicals['Uranium (soluble compounds, as U)'].standards.niosh_rel.notes.join('|').replace(',', '').split('|')

chemicals['Beryllium &amp; beryllium compounds (as Be)'].general_standard = [link_gs('1910.1024')]
chemicals['Crotonaldehyde'].cas = '123-73-9 / 4170-30-3'
chemicals['Emery'].cas += ' / 12415-34-8'