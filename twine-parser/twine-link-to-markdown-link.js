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

module.exports = (stringWithLinks, nameToId) => replace(
	twineLinkRegex,
	(linkText, pageNameFromOriginalLink) => {
		const pageNameToLinkTo = pageNameFromOriginalLink.trim()
		const pageIdToLinkTo = nameToId[pageNameToLinkTo]

		// console.log(pageNameToLinkTo, pageIdToLinkTo) 

		if (!pageIdToLinkTo) {
			throw new Error(`Could not find id for page |${ pageNameToLinkTo }|`)
		}

		return `[${ linkText }](${ pageIdToLinkTo })`
	}
	,
	stringWithLinks
)
