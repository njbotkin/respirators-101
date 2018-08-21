import Info from './Info.html'

export default () => ({
	name: `app.info`,
	route: `info`,
	template: Info,
	activate(context) {
		let store = context.domApi.store
		store.set({ nav: {
			title: 'My Info'
		} }, false)
	}
})
