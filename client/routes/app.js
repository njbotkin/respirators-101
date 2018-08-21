import App from './App.html'

export default ({ on }) => {

	var initialState;
	on(`stateChangeStart`, (e) => { 
		initialState = e
	})

	return {
		name: `app`,
		route: ``,
		template: App,
		resolve() {
			return Promise.resolve({
				initialState
			})
		},
		activate(context) {
			// forward events
			const unsubscribe = on(`stateChangeStart`, (e) => { 
				context.domApi.fire(`stateChange`, e)
			})
			context.on(`destroy`, unsubscribe)

			let store = context.domApi.store
			store.set({ nav: {
				title: ''
			} }, false)
		}
	}
}
