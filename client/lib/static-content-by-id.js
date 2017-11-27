import staticHtmlFiles from 'data/globbed-content.js'
import pathToId from 'lib/path-to-id.js'
import idToName from 'data/id-to-name.json'

const idToComponent = staticHtmlFiles.reduce((acc, { path, export: component }) => {
	const id = pathToId(path)
	const name = idToName[id]

	acc[id] = {
		id,
		component,
		name,
	}

	return acc
}, Object.create(null))

export default idToComponent
