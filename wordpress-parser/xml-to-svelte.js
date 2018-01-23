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

async function parseAndWriteOutput({ inputGlob, outputDir, downloadImages, imageOutputDir }) {
	const inputPaths = await globby(inputGlob)
	await makeDir(outputDir)
	await makeDir(imageOutputDir)

	const fileContents = await Promise.all(inputPaths.map(path =>
		readFile(path, { encoding: `utf8` })
	))

	await Promise.all(fileContents.map(xmlString =>
		parseXmlAndOutputSvelteComponents({ xmlString, outputDir, downloadImages, imageOutputDir })
	))
}


function selectNameById(data, id) {
	for ( var name in data ) {
		if(data[name].id == id) {
			return name
		}
	}
	return false
}

async function parseXmlAndOutputSvelteComponents({ xmlString, outputDir, downloadImages, imageOutputDir }) {
	const doc = parseXml(xmlString)
	const rss = findFirstChild(doc, `rss`)
	const channel = findFirstChild(rss, `channel`)

	// categories
	const categories = {}
	channel.children.forEach(node => {
		if(node.name !== 'wp:category') return

		const id = extractText(findFirstChild(node, `wp:term_id`))
		const name = extractText(findFirstChild(node, `wp:category_nicename`))
		const title = extractText(findFirstChild(node, `wp:cat_name`))
		const description = extractText(findFirstChild(node, `wp:category_description`))
		const children = []

		categories[name] = {
			id,
			title,
			description,
			children
		}

	})

	const posts = {}
	channel.children.forEach(node => {
		if(node.name !== 'item') return false
		if(extractText(findFirstChild(node, `wp:post_type`)) !== 'post') return false

		const id = extractText(findFirstChild(node, `wp:post_id`))
		const title = extractText(findFirstChild(node, `title`))
		const name = extractText(findFirstChild(node, `wp:post_name`))
		const content = extractText(findFirstChild(node, `content:encoded`))

		const category = findFirstChild(node, `category`).attributes.nicename

		const meta = extractPostMeta(node)

		const categoryId = categories[category].id
		const order = meta[ '_sort_' + categoryId ] || null

		categories[category].children.push({
			name,
			order
		})

		posts[name] = {
			title,
			id,
			content
		}
	})

	var menu = channel.children.filter(node => {
		if(node.name !== 'item') return false
		if(extractText(findFirstChild(node, `wp:post_type`)) !== 'nav_menu_item') return false
		return true
	} )
		.map(node => {

			const meta = extractPostMeta(node)

			const type = meta._menu_item_object
			const id = meta._menu_item_object_id
			const name = type === 'post' ? selectNameById(posts, id) : selectNameById(categories, id)

			return {
				type,
				name,
				id,
				order: extractText(findFirstChild(node, `wp:menu_order`))
			}
		})

	// for component generation
	const pageDetails = []
	for (name in posts) {
		pageDetails.push({
			id: name,
			content: posts[name].content,
			title: posts[name].title,
		})
	}


	// now that the data is hooked up properly, sort and clean
	for(var name in categories) {
		categories[name].children.sort((a, b) => {
			return a.order - b.order;
		})
		categories[name].children = categories[name].children.map(n => {
			return n.name
		})
		delete categories[name].id
	}

	menu.sort((a, b) => {
		return a.order - b.order;
	})
	menu = menu.map(n => {
		return {
			type: n.type,
			name: n.name
		}
	})

	for(name in posts) {
		posts[name] = posts[name].title
	}

	const idToName = pageDetails.reduce((acc, { id, title }) => {
		acc[id] = title
		return acc
	}, Object.create(null))
	
	await writeFile(joinPath(__dirname, `../client/data/posts.json`), JSON.stringify(posts, null, `\t`))
	await writeFile(joinPath(__dirname, `../client/data/categories.json`), JSON.stringify(categories, null, `\t`))
	await writeFile(joinPath(__dirname, `../client/data/menu.json`), JSON.stringify(menu, null, `\t`))

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

function extractPostMeta(node) {
	const meta = {}
	node.children.forEach(n2 => {
		if(n2.name !== 'wp:postmeta') return
		meta[extractText(findFirstChild(n2, `wp:meta_key`))] = extractText(findFirstChild(n2, `wp:meta_value`))
	})
	return meta
}


// /////////////////////////////////////////////////////////////
const inputGlob = joinPath(__dirname, `../wordpress-data/*.xml`)
const outputDir = joinPath(__dirname, `../client/data/content/`)
const imageOutputDir = joinPath(__dirname, `../public/wp-images`)
const downloadImages = true

parseAndWriteOutput({ inputGlob, outputDir, downloadImages, imageOutputDir })
