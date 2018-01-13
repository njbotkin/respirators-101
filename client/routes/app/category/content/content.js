import StaticContent from './Content.html'

import idToPage from 'lib/static-content-by-id.js'
import categories from 'data/categories.json'

export default ({ on }) => ({
	name: `wrapper.app.categorycontent`,
	route: `categorycontent/:id`,
	template: StaticContent,
	resolve(data, params) {

		const page = idToPage[params.id]
		const category = categories[params.catid]

		if (!page || !category) {
			return Promise.reject({
				redirectTo: {
					name: `wrapper.app.not-found`,
					params: {
						route: `/static/${ params.id }`,
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
