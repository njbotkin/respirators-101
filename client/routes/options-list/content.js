import StaticContent from './Content.html'

import idToPage from 'lib/static-content-by-id.js'

export default () => ({
	title: 'Respirator Selection',
	name: `app.options-list`,
	route: `/options/:id(.+)`,
	template: StaticContent,
	resolve(data, params) {
		const page = idToPage[params.id] 

		if (!page) {
			return Promise.reject({
				redirectTo: {
					name: `app.not-found`,
					params: {
						route: `/static/${ params.id }`,
					},
				},
			})
		}

		const { component } = page

		return Promise.resolve({
			component,
			title: page.name
		})
	}
})
