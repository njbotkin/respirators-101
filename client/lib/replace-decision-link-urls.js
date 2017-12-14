import replace from 'better-replace'

const regex = /href="(\d+)"/

export default (html, makePath) => replace(
	regex,
	id => `href="${ makePath(`wrapper.app.respirator-picker`, { id }) }"`,
	html
)
