const match = require(`better-match`)
const r = require(`regex-fun`)
const { decode } = require(`he`)

const passageRegex = r.combine(
	`<tw-passagedata`,
	r.capture(/[^>]+/),
	`>`,
	r.capture(/[^<]+/),
	`</tw-passagedata>`
)

const storyAttributesRegex = r.combine(
	`<tw-storydata`,
	r.capture(/[^>]+/),
	`>`
)

module.exports = html => {
	const storyAttributesString = storyAttributesRegex.exec(html)[1]
	const attributes = parseAttributes(storyAttributesString)

	return {
		attributes,
		passages: match(passageRegex, html).map(([ attributes, text ]) => ({
			attributes: parseAttributes(attributes),
			text: decode(text),
		})),
	}
}

const optionalWhitespace = /\s*/
const attributeRegex = r.combine(
	r.capture(/[^= ]+/),
	optionalWhitespace,
	`=`,
	optionalWhitespace,
	`"`,
	r.capture(/[^"]+/),
	`"`,
)

function parseAttributes(attributesString) {
	const map = Object.create(null)

	match(attributeRegex, attributesString).forEach(([ attributeName, attributeValue ]) => {
		const name = attributeName.trim()
		const value = decode(attributeValue.trim(), {
			isAttributeValue: true,
		})

		map[name] = value
	})

	return map
}
