import Home from './Home.html'

import idToName from 'data/id-to-name.json'

const contentIdsAndNames = Object.keys(idToName).map(id => ({
	id,
	name: idToName[id],
}))

export default () => ({
	name: `home`,
	route: `home`,
	template: Home,
	resolve(data, params) {
		return Promise.resolve({
			contentIdsAndNames,
		})
	},
})
