import App from './App.html'

export default ({ on }) => ({
	name: `app`,
	route: ``,
	template: App,
	activate(stateContext) {
		// forward events
		const unsubscribe = on(`stateChangeStart`, (e) => stateContext.domApi.fire(`stateChange`, e))
		stateContext.on(`destroy`, unsubscribe)
	},
})
