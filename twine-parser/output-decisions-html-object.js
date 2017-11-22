const Remarkable = require(`remarkable`)

const parse = require(`./parse-passages-from-html`)
const convertLinksToMarkdown = require(`./twine-link-to-markdown-link`)

const { readFileSync, writeFileSync } = require(`fs`)
const { join: joinPath } = require(`path`)

const remarkable = new Remarkable({
	html: true,
})

function parseAndWriteOutput(inputPath, outputPath) {
	const html = readFileSync(inputPath)

	const story = parse(html)

	const namesToIds = makeMapOfNamesToIds(story.passages)

	// console.log(JSON.stringify(namesToIds, null, `\t`))

	const friendlyOutput = {
		start: story.attributes.startnode,
		decisions: makeMapOfIdsToFinalForm(story.passages, markdownToHtml(namesToIds)),
	}

	writeFileSync(outputPath, JSON.stringify(friendlyOutput, null, `\t`))
}

const markdownToHtml = namesToIds => markdown => remarkable.render(
	passageTextToFinalHtml(markdown, namesToIds)
)

const makeMapOfNamesToIds = passages => makeMap(
	passages,
	({ attributes }) => [ attributes.name.trim(), attributes.pid ]
)

const makeMapOfIdsToFinalForm = (passages, transformToFinalForm) => makeMap(
	passages,
	({ attributes, text }) => [ attributes.pid, transformToFinalForm(text) ]
)

function passageTextToFinalHtml(text, namesToIds) {
	const properMarkdown = convertLinksToMarkdown(text, namesToIds)
	return properMarkdown
}


function makeMap(array, fn) {
	const map = Object.create(null)

	array.forEach(element => {
		const [ key, value ] = fn(element)
		map[key] = value
	})

	return map
}


// //////////////////////////////////////////////////////////////////////////////////
const inputPath = joinPath(__dirname, `../twine-data/How to Pick a Respirator.html`)
const outputPath = joinPath(__dirname, `../client/data/decision-data.json`)

parseAndWriteOutput(inputPath, outputPath)

