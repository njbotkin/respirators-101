const r = require(`regex-fun`)

r.combine(
	`<hr>`,
	r.capture(r.anyNumber(/[.\n]/))
)

module.exports = html => {
	const pieces = html.split(`<hr>`)

	if (pieces.length === 1) {
		return html
	}

	const footer = pieces.pop()

	const rest = pieces.join(``)

	return `${ rest }<div class="decision-footer">${ footer }\n</div>`
}
