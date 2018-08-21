import StaticContent from './Content.html'

import idToPage from 'lib/static-content-by-id.js'
import categories from 'data/categories.json'

export default () => ({
	name: `app.categorycontent`,
	route: `/category/:catid/:id`,
	template: StaticContent,
	resolve(data, params) {

		const page = idToPage[params.id]
		const category = categories[params.catid]

		if (!page || !category) {
			return Promise.reject({
				redirectTo: {
					name: `app.not-found`,
					params: {
						route: `/category/${ params.catid }/${ params.id }`,
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
		let makePath = context.domApi._state.asr.makePath

		const page = idToPage[params.id]
		const category = categories[params.catid]

		const position = category.children.indexOf(params.id)

		const prev = position > 0 ? makePath('app.categorycontent', { id: category.children[position-1], catid: params.catid } ) : null
		const next = position < category.children.length-1 ? makePath('app.categorycontent', { id: category.children[position+1], catid: params.catid } ) : null

		store.set({ nav: {
			title: categories[params.catid].title,
			sub: {
				title: page.name,
				prev,
				next
			}
		} }, false)
	}
})
