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
						route: `/category${ params.catid }/${ params.id }`,
					},
				},
			})
		}

		const position = category.children.indexOf(params.id)

		const prev = position > 0 ? category.children[position-1] : null;
		const next = position < category.children.length-1 ? category.children[position+1] : null;

		const { component } = page

		return Promise.resolve({ 
			component,
			prev,
			next,
			catid: params.catid,
			title: page.name
		})
	}
})
