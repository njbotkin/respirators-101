import StateRouter from 'abstract-state-router'
import makeSvelteStateRenderer from 'svelte-state-renderer'
import createEmitter from 'better-emitter'

import states from 'data/globbed-routes.js'

const stateRouter = StateRouter(makeSvelteStateRenderer(), document.querySelector(`#target`))

const context = createEmitter({
	makePath: stateRouter.makePath,
})

states.forEach(createState => stateRouter.addState(createState(context)))

stateRouter.on(`routeNotFound`, (route, parameters) => {
	stateRouter.go(`app.not-found`, Object.assign({ route }, parameters), { replace: true })
})

stateRouter.on(`stateChangeStart`, (state, params) => {
	context.emit(`stateChangeStart`, { state, params })
})

stateRouter.evaluateCurrentRoute(`app.home`)
// context.emit(`stateChangeStart`, {id: 'home'}) 