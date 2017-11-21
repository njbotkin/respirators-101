import Home from './Home.html'

import idToHtml from 'lib/static-content-by-id.js'

const staticPages = Object.keys(idToHtml).map(id => idToHtml[id])

export default () => ({
	name: `home`,
	route: `home`,
	template: Home,
	resolve(data, params) {
		return Promise.resolve({
			staticPages,
		})
	},
})
