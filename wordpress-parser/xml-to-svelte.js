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
const md = require('markdown-it')({
	html: true,
	linkify: true,
})

async function parseAndWriteOutput({ inputGlob, outputDir, downloadImages, imageOutputDir }) {
	const inputPaths = await globby(inputGlob)
	await makeDir(outputDir)
	await makeDir(imageOutputDir)

	const fileContents = await Promise.all(inputPaths.map(path =>
		readFile(path, { encoding: `utf8` })
	))

	const tablepressJSON = JSON.parse(await readFile(joinPath(__dirname, '../wordpress-data/tablepress_tables.json'), { encoding: `utf8` }))

	await Promise.all(fileContents.map(xmlString =>
		parseXmlAndOutputSvelteComponents({ xmlString, outputDir, downloadImages, imageOutputDir, tablepressJSON })
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

async function parseXmlAndOutputSvelteComponents({ xmlString, outputDir, downloadImages, imageOutputDir, tablepressJSON }) {
	const doc = parseXml(xmlString)
	const rss = findFirstChild(doc, `rss`)
	const channel = findFirstChild(rss, `channel`)
	const tablepress = tablepressJSON.table_post

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

	// content  
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


	// respirator option lists
	const lists = {}
	channel.children.forEach(node => {
		if(node.name !== 'item') return false
		if(extractText(findFirstChild(node, `wp:post_type`)) !== 'respirator_options') return false

		// const id = extractText(findFirstChild(node, `wp:post_id`))
		const title = extractText(findFirstChild(node, `title`))
		const name = extractText(findFirstChild(node, `wp:post_name`))
		const content = extractText(findFirstChild(node, `content:encoded`))

		lists[name] = {
			title,
			name,
			content
		}
	})


	// tablepress tables
	const tables = {}
	channel.children.forEach(node => {
		if(node.name !== 'item') return false
		if(extractText(findFirstChild(node, `wp:post_type`)) !== 'tablepress_table') return false

		const id = extractText(findFirstChild(node, `wp:post_id`))
		const content = extractText(findFirstChild(node, `content:encoded`))

		tables[id] = content
	})

	// for (var id in tables) {
	// 	console.log('\n\n', id, tables[id])
	// }


	var menu = channel.children.filter(node => {
		if(node.name !== 'item') return false
		if(extractText(findFirstChild(node, `wp:post_type`)) !== 'nav_menu_item') return false
		return true
	} )
		.map(node => {

			const meta = extractPostMeta(node)

			const type = meta._menu_item_object
			var title, name, path, id

			if(type == 'page') {
				return {}
			}
			if(type == 'post') {
				id = meta._menu_item_object_id
				name = selectNameById(posts, id)
			}
			if(type == 'category') {
				id = meta._menu_item_object_id
				name = selectNameById(categories, id)
			}
			if(type == 'custom') {
				title = extractText(findFirstChild(node, `title`))
				path = meta._menu_item_url
			}	

			return {
				type,
				name,
				id,
				title,
				path,
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
	for (name in lists) {
		pageDetails.push({
			id: name,
			content: lists[name].content,
			title: lists[name].title,
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
	menu = menu.filter(n => Object.keys(n).length > 0).map(n => ({
			type: n.type,
			title: n.title,
			name: n.name,
			path: n.path
		})
	)

	for(name in posts) {
		posts[name] = posts[name].title
	}
	for(name in lists) {
		lists[name] = lists[name].title
	}


	const idToName = pageDetails.reduce((acc, { id, title }) => {
		acc[id] = title
		return acc
	}, Object.create(null))
	
	await writeFile(joinPath(__dirname, `../client/data/id-to-name.json`), JSON.stringify(idToName, null, `\t`))
	await writeFile(joinPath(__dirname, `../client/data/posts.json`), JSON.stringify(posts, null, `\t`))
	await writeFile(joinPath(__dirname, `../client/data/option-lists.json`), JSON.stringify(lists, null, `\t`))
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
		const svelteComponent = convertContentToSvelteComponent({ content, title, tables, tablepress })
		const path = joinPath(outputDir, `${ id }.html`)
		await writeFile(path, svelteComponent)
	}))
}



const flatMap = (ary, fn) => ary.reduce((acc, element, index) => [ ...acc, ...fn(element, index) ], [])

function convertContentToSvelteComponent({ content, title, tables, tablepress }) {

	var expandReplacements, tableReplacements

	content = fixImages(content);
	({ expandReplacements, content } = fixExpand(content));
	({ tableReplacements, content } = insertTables(content, tables, tablepress));
	content = md.render(content);
	content = deparagraph(content); // markdown is too aggressive, and this is easier than writing a markdown plugin

	return `

${ content }

<script>
	${ expandReplacements ? "import Accordion from 'lib/Accordion.html'" : "" }
	${ tableReplacements ? "import Table from 'lib/Table.html'" : "" }
	export default {
		components: {
			${ expandReplacements ? "Accordion," : "" }
			${ tableReplacements ? "Table" : "" }
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

const fixExpand = html => {
	var expandReplacements = 0
	var content = replace(
		/\[expand title="([^"]+)"\]((?:.|\n)+?)\[\/expand\]/,
		(title, content) => {
			expandReplacements++
			return `<Accordion title="${ he.encode(title) }">${ content }</Accordion>`
		},
		html
	)

	return {
		expandReplacements,
		content
	}
}

const insertTables = (html, tables, tablepress) => {
	var tableReplacements = 0
	var content = replace(
		/\[table id=([0-9]+) \/\]/,
		(id) => {
			tableReplacements++
			return `<Table data="${ he.encode(tables[tablepress[id]]) }"></Table>`
		},
		html
	)

	return {
		tableReplacements,
		content
	}
}

const deparagraph = html => html.replace(/<p><Accordion/g, '<Accordion').replace(/<\/Accordion><\/p>/g, '</Accordion>')
// const newlineBreaks = html => replace(
// 	/\n/,
// 	() => `<br>`,
// 	html
// )

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
