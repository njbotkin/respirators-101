import Home from './Home.html'

import idToHtml from 'lib/static-content-id-to-html.js'

const staticHtmlIds = Object.keys(idToHtml)

export default {
	name: 'home',
	route: 'home',
	template: Home,
	resolve(data, params) {
		return Promise.resolve({
			staticHtmlIds,
		})
	},
}
