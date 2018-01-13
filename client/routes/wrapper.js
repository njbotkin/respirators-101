import Wrapper from './Wrapper.html'

export default ({ on }) => ({
	name: `wrapper`,
	route: ``,
	template: Wrapper,
	activate(stateContext) {
		// forward events
		const unsubscribe = on(`stateChangeStart`, (e) => stateContext.domApi.fire(`stateChange`, e))
		stateContext.on(`destroy`, unsubscribe)
	},
})
