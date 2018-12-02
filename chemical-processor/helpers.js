
function linkify(s) {
	return s.replace(/Appendix ([a-zA-Z])/g, (match, p1, offset, string) => {
		return '<a href="https://www.cdc.gov/niosh/npg/nengapdx' + p1.toLowerCase() + '.html">' + match + '</a>'
	})
	.replace(/<a href='#' external data-url='([^']+)'>/g, (match, p1, offset, string) => {
		return '<a href="' + p1 + '">'
	})
	.replace(/PNOR/g, () => {
		return '<a href="https://www.cdc.gov/niosh/npg/npgd0480.html">PNOR</a>'
	})
}

// no duplicates
function addNote(notes, note) {
	for(let n of notes) {
		if(n.indexOf(note) > -1) return;
	}
	notes.push(note.replace(/<br>/g, ''))
}

module.exports = {
	linkify,
	addNote
}