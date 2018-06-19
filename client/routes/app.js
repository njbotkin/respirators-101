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
		activate(stateContext) {
			// forward events
			const unsubscribe = on(`stateChangeStart`, (e) => { 
				stateContext.domApi.fire(`stateChange`, e)
			})
			stateContext.on(`destroy`, unsubscribe)
		},
		resolve() {
			return Promise.resolve({
				initialState
			})
		}
	}
}
