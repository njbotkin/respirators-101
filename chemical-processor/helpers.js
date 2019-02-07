const striptags = require('striptags');

function linkify(s) {
	return s.replace(/Appendix ([a-zA-Z])/g, (match, p1) => {
		return '<a href="https://www.cdc.gov/niosh/npg/nengapdx' + p1.toLowerCase() + '.html">' + match + '</a>'
	})
	.replace(/<a href='#' external data-url='([^']+)'>/g, (match, p1) => {
		return '<a href="' + p1 + '">'
	})
	.replace(/PNOR/g, match => {
		return '<a href="https://www.cdc.gov/niosh/npg/npgd0480.html">' + match + '</a>'
	})
	.replace(/Section ([0-9]{4})/g, (match, p1) => {
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

	let split = note.split('<br>')
	if(split.length > 1) {
		for(let s of split) addNote(notes, s)
		return 
	}

	note = striptags(note).trim()
	if(note == '') return

	// if there's anything before an appendix link, split it into a separate note
	split = note.match(/(.+)(See Appendix [a-zA-Z])(.*)/)
	if(split) {
		addNote(notes, split[1])
		addNote(notes, split[2])
		addNote(notes, split[3])
		return
	}

	note = linkify(note)

	for(let n of notes) {
		if(n.toUpperCase().indexOf(note.toUpperCase()) > -1) return // no dupes
	}
	notes.push(note.replace(/\[\]/g, ''))
}

module.exports = {
	linkify,
	addNote
}