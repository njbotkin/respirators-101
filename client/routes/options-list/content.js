import StaticContent from './Content.html'

import idToPage from 'lib/static-content-by-id.js'

export default () => ({
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
						route: `/options/${ params.id }`,
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

		let store = context.domApi.store
		let params = context.parameters

		const page = idToPage[params.id] 

		store.set({ nav: {
			title: 'Respirator Selection',
			sub: {
				title: 'Acceptable Respirator Options',
				prev: 'javascript:window.history.go(-1)'
			}
		} }, false)
	}
})
