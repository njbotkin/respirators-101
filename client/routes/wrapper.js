import Wrapper from './Wrapper.html'

export default ({ on }) => ({
	name: `wrapper`,
	route: ``,
	template: Wrapper,
	activate(stateContext) {
		const unsubscribe = on('stateChangeStart', () => stateContext.domApi.fire('closeSlideOut'))
		stateContext.on('destroy', unsubscribe)
	}
})  
