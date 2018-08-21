import StaticContent from './Content.html'

import idToPage from 'lib/static-content-by-id.js'

export default () => ({
	name: `app.content`,
	route: `/content/:id(.+)`,
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
			component
		})
	},
	activate(context) {
		const store = context.domApi.store
		const params = context.parameters
		const page = idToPage[params.id] 

		store.set({ nav: {
			title: page.name
		} }, false)
	}
})
