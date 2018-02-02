const Remarkable = require(`remarkable`)

const parse = require(`./parse-passages-from-html`)
const convertLinksToMarkdown = require(`./twine-link-to-markdown-link`)
const addDivAroundFooter = require(`./add-div-around-footer`)
const addUlAnswerLinksClass = require(`./add-ul-answer-links-class`)

const { readFileSync, writeFileSync } = require(`fs`)
const { join: joinPath } = require(`path`)

const remarkable = new Remarkable({
	html: true,
})

function parseAndWriteOutput(inputPath, outputPath) {
	const html = readFileSync(inputPath)

	const story = parse(html)

	// console.log(story)

	const namesToIds = makeMapOfNamesToIds(story.passages)

	// console.log(JSON.stringify(namesToIds, null, `\t`))

	const friendlyOutput = {
		start: story.attributes.startnode,
		decisions: makeMapOfIdsToFinalForm(story.passages, markdownToHtml(namesToIds)),
	}

	// console.log(friendlyOutput)

	writeFileSync(outputPath, JSON.stringify(friendlyOutput, null, `\t`))
}

const markdownToHtml = namesToIds => (markdown, title) => addDivAroundFooter(
	addUlAnswerLinksClass(
		remarkable.render(
			passageTextToFinalMarkdown(markdown, title, namesToIds)
		)
	)
)

const makeMapOfNamesToIds = passages => makeMap(
	passages,
	({ attributes, text }) => {

		const redirect = text.match(/http:\/\/respirators101\.iuoe\-hazmat\.com\/respirator_options\/(.*)\//)
		if(redirect) {
			attributes.pid = '#/options/' + redirect[1]
		}

		return [ attributes.name.trim(), attributes.pid ]
	}
)

const makeMapOfIdsToFinalForm = (passages, transformToFinalForm) => makeMap(
	passages,
	({ attributes, text }) => [ attributes.pid, transformToFinalForm(text, attributes.name) ]
)

function passageTextToFinalMarkdown(text, title, namesToIds) {
	return addTitleHeader(convertLinksToMarkdown(text, namesToIds), title)
}

function addTitleHeader(markdown, title) {
	return `## ${ title }\n\n` + markdown
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

