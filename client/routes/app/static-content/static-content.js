import StaticContent from './StaticContent.html'

import idToPage from 'lib/static-content-by-id.js'

export default () => ({
	name: `app.static-content`,
	route: `/static/:fileId(.+)`,
	template: StaticContent,
	resolve(data, params) {
		const staticPage = idToPage[params.fileId]

		if (!staticPage) {
			return Promise.reject({
				redirectTo: {
					name: `app.not-found`,
					params: {
						route: `/static/${ params.fileId }`,
					},
				},
			})
		}

		const { html } = staticPage

		return Promise.resolve({
			html,
		})
	},
})
