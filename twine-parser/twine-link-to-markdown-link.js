const r = require(`regex-fun`)
const replace = require(`better-replace`)

// [[Text->Page to link to]]
const captureAnything = r.capture(r.anyNumberNonGreedy(/./))
const twineLinkRegex = r.combine(
	`[[`,
	captureAnything,
	`->`,
	captureAnything,
	`]]`
)

module.exports = {

	toMarkdown: (stringWithLinks, namesToIds) => replace(
		twineLinkRegex,
		(linkText, pageNameFromOriginalLink) => {
			const pageNameToLinkTo = pageNameFromOriginalLink.trim()
			const pageIdToLinkTo = namesToIds[pageNameToLinkTo]

			// console.log(pageNameToLinkTo, pageIdToLinkTo) 

			if (!pageIdToLinkTo) {
				throw new Error(`Could not find id for page |${ pageNameToLinkTo }|`)
			}

			return `[${ linkText }](${ pageIdToLinkTo })`
		}
		,
		stringWithLinks
	),

	list: (stringWithLinks, namesToIds) => {

		var matches = []

		stringWithLinks.replace(r.flags('gi', twineLinkRegex), (match, linkText, pageNameFromOriginalLink) => {
			matches.push(namesToIds[pageNameFromOriginalLink.trim()])
		})

		return matches
	}

}