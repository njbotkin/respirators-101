import Calculate from './Calculate.html'

export default () => ({
	name: `app.calculate`,
	route: `calculate`,
	template: Calculate,
	activate(context) {
		let store = context.domApi.store
		store.set({ nav: {
			title: 'Calculate'
		} }, false)
	}
})
