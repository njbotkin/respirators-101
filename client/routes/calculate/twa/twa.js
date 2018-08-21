import TWA from './TWA.html'

export default () => ({
	name: `app.calculate-twa`,
	route: `calculate/twa`,
	template: TWA,
	activate(context) {
		let store = context.domApi.store
		store.set({ nav: {
			title: 'Calculate TWA'
		} }, false)
	}
})
