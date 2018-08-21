import RespiratorIntroduction from './RespiratorIntroduction.html'

export default () => ({
	name: `app.respirator-introduction`,
	route: `/respirator-introduction`,
	template: RespiratorIntroduction,
	activate(context) {
		let store = context.domApi.store
		store.set({ nav: {
			title: 'Respirator Selection'
		} }, false)
	}
})