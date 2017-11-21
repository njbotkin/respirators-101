const test = require(`tape-catch`)

const parse = require(`./parse-passages-from-html`)

const { readFileSync } = require(`fs`)
const { join: joinPath } = require(`path`)

const fixturePath = joinPath(__dirname, `fixtures/simple-data.html`)
const html = readFileSync(fixturePath)

test(`Parsing the simple-data fixture`, t => {
	const story = parse(html)

	t.equal(story.attributes.startnode, `6`)

	t.equal(story.passages.length, 3, `3 passages`)

	t.equal(story.passages[1].attributes.name, `STEP 1`, `Parses name attribute of the starting node`)
	t.equal(story.passages[1].attributes.pid, `6`, `Parses pid attribute of the starting node`)

	t.equal(story.passages[2].text, `"Stop on Step 1" options chart`, `Parses contents of the third node`)
	t.equal(story.passages[2].attributes.name, `"Stop on Step 1" options chart`, `Parses name attribute of third node`)
	t.equal(story.passages[2].attributes.pid, `114`, `Parses pid attribute of third node`)

	t.end()
})
