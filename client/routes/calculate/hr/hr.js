import HR from './HR.html'

export default () => ({
	name: `app.calculate-hr`,
	route: `calculate/hr`,
	template: HR,
	activate(context) {
		let store = context.domApi.store
		store.set({ nav: {
			title: 'Calculate HR'
		} }, false)
	}
})
