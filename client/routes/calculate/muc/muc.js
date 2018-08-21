import MUC from './MUC.html'

export default () => ({
	name: `app.calculate-muc`,
	route: `calculate/muc`,
	template: MUC,
	activate(context) {
		let store = context.domApi.store
		store.set({ nav: {
			title: 'Calculate MUC'
		} }, false)
	}
})
