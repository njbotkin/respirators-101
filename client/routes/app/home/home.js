import Home from './Home.html'

import navTree from 'data/navigation.json'
import idToName from 'data/id-to-name.json'

var navigation = []
navTree.forEach(e => {
	var children = e.children.map(id => ({
		id,
		name: idToName[id],
	}))

	navigation.push({
		id: e.id,
		title: e.title,
		children
	})
})

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
