import staticHtmlFiles from 'lib/globbed-static-html.js'

import pathToId from 'lib/path-to-id.js'
import idToName from 'lib/static-html-page-names.js'

const idToHtml = staticHtmlFiles.reduce((acc, { path, export: html }) => {
	const id = pathToId(path)
	const name = idToName[id]

	if (name === undefined) {
		throw new Error(`No name found for static page ${id}`)
	}

	acc[id] = {
		id,
		html,
		name,
	}

	return acc
}, Object.create(null))

export default idToHtml
