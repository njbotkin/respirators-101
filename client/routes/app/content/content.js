import StaticContent from './Content.html'

import idToPage from 'lib/static-content-by-id.js'

export default () => ({
	name: `wrapper.app.content`,
	route: `/content/:id(.+)`,
	template: StaticContent,
	resolve(data, params) {
		const page = idToPage[params.id]

		if (!page) {
			return Promise.reject({
				redirectTo: {
					name: `wrapper.app.not-found`,
					params: {
						route: `/static/${ params.id }`,
					},
				},
			})
		}

		const { component } = page

		return Promise.resolve({
			component,
		})
	},
})
