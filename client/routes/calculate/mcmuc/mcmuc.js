import MCMUC from './MCMUC.html'

export default () => ({
	name: `app.calculate-mcmuc`,
	route: `calculate/mcmuc`,
	template: MCMUC,
	activate(context) {
		let store = context.domApi.store
		store.set({ nav: {
			title: 'Calculate Multi-component MUC'
		} }, false)
	}
})
