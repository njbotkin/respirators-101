import StateRouter from 'abstract-state-router'
import makeSvelteStateRenderer from 'svelte-state-renderer'
import createEmitter from 'better-emitter'

import { store } from 'lib/storage.js'
import states from 'data/globbed-routes.js'

import smoothscroll from 'smoothscroll-polyfill'
smoothscroll.polyfill()

const stateRouter = StateRouter(makeSvelteStateRenderer({ store }), document.body)

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