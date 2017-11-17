import staticHtmlFiles from 'lib/globbed-static-html.js'

import pathToId from 'lib/path-to-id.js'

const idToHtml = staticHtmlFiles.reduce((acc, { path, export: html }) => {
	const id = pathToId(path)
	acc[id] = html
	return acc
}, Object.create(null))

export default idToHtml
