import Contact from './Contact.html'

export default () => ({
	name: `app.contact`,
	route: `/contact`,
	template: Contact,
	activate(context) {
		let store = context.domApi.store
		store.set({ nav: {
			title: 'Contact Us'
		} }, false)
	}
})