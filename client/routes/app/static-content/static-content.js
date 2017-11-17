import StaticContent from './StaticContent.html'

import idToPage from 'lib/static-content-by-id.js'

export default {
	name: 'app.static-content',
	route: '/static/:fileId(.+)',
	template: StaticContent,
	resolve(data, params) {
		const staticPage = idToPage[params.fileId]

		// TODO: if static is undefined, redirect to not-found route

		const { html } = staticPage

		return Promise.resolve({
			html,
		})
	},
}
