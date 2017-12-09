import Home from './Home.html'

import navTree from 'data/navigation.json'
import idToName from 'data/id-to-name.json'

const navigation = navTree.map(e => {
	return {
		id: e.id,
		title: e.title,
		children: e.children.map(id => ({
			id,
			name: idToName[id],
		}))
	}
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
