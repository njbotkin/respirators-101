import StaticContent from './CategoryIndex.html'

import categories from 'data/categories.json'
import posts from 'data/posts.json'

export default () => ({
	name: `wrapper.app.category`,
	route: `/category/:catid`,
	template: StaticContent,
	resolve(data, params) {

		const category = categories[params.catid]

		if (!category) {
			return Promise.reject({
				redirectTo: {
					name: `wrapper.app.not-found`,
					params: {
						route: `/static/${ params.id }`,
					},
				},
			})
		}

		return Promise.resolve({ 
			title: category.title,
			description: category.description,
			catid: params.catid,
			children: category.children.map(e => ({
				title: posts[e],
				id: e,
			})) 
		})
	},
})
