import StaticContent from './CategoryIndex.html'

import categories from 'data/categories.json'
import posts from 'data/posts.json'

export default () => ({
	name: `app.category`,
	route: `/category/:catid`,
	template: StaticContent,
	resolve(data, params) {

		const category = categories[params.catid]

		if (!category) {
			return Promise.reject({
				redirectTo: {
					name: `app.not-found`,
					params: {
						route: `/static/${ params.id }`,
					},
				},
			})
		}

		return Promise.resolve({ 
			description: category.description,
			catid: params.catid,
			children: category.children.map(e => ({
				title: posts[e],
				id: e,
			})) 
		})
	},
	activate(context) {
		const category = categories[context.parameters.catid]
		let store = context.domApi.store
		store.set({ nav: {
			title: category.title
		} }, false)
	}
})
