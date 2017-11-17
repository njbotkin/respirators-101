import StaticContent from './StaticContent.html'

import idToHtml from 'lib/static-content-id-to-html.js'

console.log(idToHtml)

export default {
	name: 'app.static-content',
	route: '/static/:fileId(.+)',
	template: StaticContent,
	resolve(data, params) {
		const html = idToHtml[params.fileId]

		// TODO: if html is undefined, redirect to not-found route

		return Promise.resolve({
			html,
		})
	},
}
