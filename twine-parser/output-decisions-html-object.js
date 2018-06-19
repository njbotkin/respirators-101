const Remarkable = require(`remarkable`)

const parse = require(`./parse-passages-from-html`)
const parseLinks = require(`./twine-link-to-markdown-link`)
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

	// console.log(story.passages[1].attributes)

	const namesToIds = makeMapOfNamesToIds(story.passages)

	// construct list where linkedto -> linkedfrom
	var linkDestinations = []
	for(let passage of story.passages) {
		linkDestinations.push({
			from: passage.attributes.pid,
			to: parseLinks.list(passage.text, namesToIds)
		}) 
	}

	// console.log(linkDestinations)

	// console.log(JSON.stringify(namesToIds, null, `\t`))

	const friendlyOutput = {
		start: story.attributes.startnode,
		decisions: makeMapOfIdsToFinalForm(story.passages, markdownToObject(namesToIds, linkDestinations)),
	}

	// console.log(friendlyOutput)

	writeFileSync(outputPath, JSON.stringify(friendlyOutput, null, `\t`))
}

const markdownToObject = (namesToIds, linkDestinations) => (markdown, title, pid) => {
	const prev = linkDestinations.find(e => e.to.indexOf(pid) > -1)

	return {
		title,
		html: addDivAroundFooter(
			addUlAnswerLinksClass(
				remarkable.render(
					parseLinks.toMarkdown(markdown, namesToIds)
				)
			)
		),
		prev: prev ? prev.from : undefined
	}
}


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
	({ attributes, text }) => [ attributes.pid, transformToFinalForm(text, attributes.name, attributes.pid) ]
)

/*function passageTextToFinalMarkdown(text, title, namesToIds) {
	return addTitleHeader(parseLinks(text, namesToIds), title)
}

function addTitleHeader(markdown, title) {
	return `## ${ title }\n\n` + markdown
}*/


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

