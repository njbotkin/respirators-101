require(`loud-rejection`)()
const pify = require(`pify`)

const { readFile, writeFile } = pify(require(`fs`))
const { join: joinPath } = require(`path`)

const makeDir = require(`make-dir`)
const parseXml = require(`@rgrove/parse-xml`)
const he = require(`he`)
const replace = require(`better-replace`)
const match = require(`better-match`)
const globby = require(`globby`)
const download = require(`download`)

async function parseAndWriteOutput({ inputGlob, outputDir, idToNameOutputFile, navigationOutputFile, downloadImages, imageOutputDir }) {
	const inputPaths = await globby(inputGlob)
	await makeDir(outputDir)
	await makeDir(imageOutputDir)

	const fileContents = await Promise.all(inputPaths.map(path =>
		readFile(path, { encoding: `utf8` })
	))

	await Promise.all(fileContents.map(xmlString =>
		parseXmlAndOutputSvelteComponents({ xmlString, outputDir, idToNameOutputFile, navigationOutputFile, downloadImages, imageOutputDir })
	))
}

async function parseXmlAndOutputSvelteComponents({ xmlString, outputDir, idToNameOutputFile, navigationOutputFile, downloadImages, imageOutputDir }) {
	const doc = parseXml(xmlString)
	const rss = findFirstChild(doc, `rss`)
	const channel = findFirstChild(rss, `channel`)
	const items = channel.children.filter(node => node.name === `item`)

	const navigation = []
	const categories = {}

	const pageDetails = items.map(itemNode => {
		const title = extractText(findFirstChild(itemNode, `title`))
		const id = extractText(findFirstChild(itemNode, `wp:post_name`))
		const content = extractText(findFirstChild(itemNode, `content:encoded`))

		const category = findFirstChild(itemNode, `category`).attributes.nicename
		const categoryTitle = extractText(findFirstChild(itemNode, `category`))

		if(categories[category] === undefined) {
			categories[category] = navigation.length
			navigation.push({
				id: category,
				title: categoryTitle,
				children: []
			})
		}

		navigation[categories[category]].children.push({
			id: id,
			name: title
		})

		return {
			title,
			id,
			content
		}
	})

	const idToName = pageDetails.reduce((acc, { id, title }) => {
		acc[id] = title
		return acc
	}, Object.create(null))
	
	// console.log(categories)
	// console.log(idToName)

	await writeFile(idToNameOutputFile, JSON.stringify(idToName, null, `\t`))
	await writeFile(navigationOutputFile, JSON.stringify(navigation, null, `\t`))

	if (downloadImages) {
		const imagesToDownload = flatMap(pageDetails, ({ content }) => match(
			/<img[^>]+src="([^"]+)"/,
			content
		).map(([ src ]) => src))

		await Promise.all(imagesToDownload.map(async url => {
			const filename = url.split(`/`).pop()
			try {
				await download(encodeURI(url), imageOutputDir, { filename })
			} catch (e) {
				console.error(`Error downloading ${ url }`)
				console.error(e.message)
			}
		}))
	}

	await Promise.all(pageDetails.map(async({ title, id, content }) => {
		const svelteComponent = convertContentToSvelteComponent({ content, title })
		const path = joinPath(outputDir, `${ id }.html`)
		await writeFile(path, svelteComponent)
	}))
}

const flatMap = (ary, fn) => ary.reduce((acc, element, index) => [ ...acc, ...fn(element, index) ], [])

function convertContentToSvelteComponent({ content, title }) {
	return `
<h1>${ he.encode(title) }</h1>

${ fixExpand(fixImages(content)) }

<script>
	import Accordion from 'lib/Accordion.html'
	export default {
		components: {
			Accordion
		}
	}
</script>
	`
}

const fixImages = html => replace(
	/<img([^>])+src="[^"]+\/([^"/]+)"/,
	(otherJunk, filename) => `<img${ otherJunk }src="wp-images/${ filename }"`,
	html
)

const fixExpand = html => replace(
	/\[expand title="([^"]+)"\]((?:.|\n)+?)\[\/expand\]/,
	(title, content) => `<Accordion title="${ he.encode(title) }">${ content }</Accordion>`,
	html
)

const findFirstChild = (xmlNode, type) => findFirst(xmlNode.children, node => node.name === type)
function findFirst(array, comparator) {
	for (let i = 0; i < array.length; ++i) {
		const item = array[i]
		if (comparator(item)) {
			return item
		}
	}

	throw new Error(`Couldn't find child`)
}

function extractText(node) {
	return node.children.filter(child => child.type === `text`).map(child => child.text).join(``)
}


// /////////////////////////////////////////////////////////////
const inputGlob = joinPath(__dirname, `../wordpress-data/*.xml`)
const outputDir = joinPath(__dirname, `../client/data/content/`)
const idToNameOutputFile = joinPath(__dirname, `../client/data/id-to-name.json`)
const navigationOutputFile = joinPath(__dirname, `../client/data/navigation.json`)
const imageOutputDir = joinPath(__dirname, `../public/wp-images`)
const downloadImages = true

parseAndWriteOutput({ inputGlob, outputDir, idToNameOutputFile, navigationOutputFile, downloadImages, imageOutputDir })
