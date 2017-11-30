import Home from './Home.html'

import navigation from 'data/navigation.json'

// convert object to array
// const contentIdsAndNames = Object.keys(idToName).map(id => ({
// 	id,
// 	name: idToName[id],
// }))

export default () => ({
	name: `app.home`,
	route: `home`,
	template: Home,
	resolve(data, params) {
		return Promise.resolve({
			navigation,
		})
	},
})
