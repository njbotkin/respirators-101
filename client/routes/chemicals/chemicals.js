import Chemicals from './Chemicals.html'

export default () => ({
	name: `app.chemicals`,
	route: `/chemicals`,
	template: Chemicals,
	activate(context) {
		let store = context.domApi.store
		store.set({ nav: {
			title: 'Chemical Selection'
		} }, false)
	}
}) 