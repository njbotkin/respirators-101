const striptags = require('striptags');

function linkify(s) {
	return s.replace(/See Appendix ([a-zA-Z])/g, (match, p1, offset, string) => {
		return '<a href="https://www.cdc.gov/niosh/npg/nengapdx' + p1.toLowerCase() + '.html">' + match + '</a>'
	})
	.replace(/<a href='#' external data-url='([^']+)'>/g, (match, p1, offset, string) => {
		return '<a href="' + p1 + '">'
	})
	.replace(/See PNOR/g, match => {
		return '<a href="https://www.cdc.gov/niosh/npg/npgd0480.html">' + match + '</a>'
	})
	.replace(/See Section ([0-9]{4})/g, (match, p1) => {
		return `<a href="https://www.dir.ca.gov/title8/${p1}.html">${match}</a>`
	})
	// general standard
	.replace(/([0-9]{4}\.[0-9]{4})/g, (match, s) => {
		return `<a href="https://www.osha.gov/laws-regs/regulations/standardnumber/${ s.slice(0, 4) }/${ s.replace(/\([a-z]\)/, '') }#${ s }">${match}</a>`
	})
	// z1
	.replace('Z-1-A', `<a href="https://www.osha.gov/dsg/annotated-pels/tablez-1.html">Z-1-A</a>`)
}

// no duplicates
function addNote(notes, note) {
	note = linkify(note.trim())
	if(note == '') return

	for(let n of notes) {
		if(striptags(n).toUpperCase().indexOf(striptags(note).toUpperCase()) > -1) return;
	}
	notes.push(note.replace(/(<br>|\[\])/g, ''))
}

// const units = [
// 	'ppm',
// 	'mgm3',
// 	'fmc3',

// ]

module.exports = {
	linkify,
	addNote
}