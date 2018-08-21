import Home from './Home.html'

export default () => ({
	name: `app.home`,
	route: `home`,
	template: Home,
	activate(context) {
		let store = context.domApi.store
		store.set({ nav: {
			title: 'Respirators 101'
		} }, false)
	}
})
