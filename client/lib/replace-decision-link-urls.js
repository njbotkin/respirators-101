import replace from 'better-replace'

const regex = /href="(\d+)"/

export default (html, makePath) => replace(
	regex,
	id => `href="${ makePath(`app.respirator-picker`, { id }) }"`,
	html
)
