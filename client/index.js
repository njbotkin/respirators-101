import StateRouter from 'abstract-state-router'
import makeSvelteStateRenderer from 'svelte-state-renderer'

import states from 'lib/globbed-routes.js'

const stateRouter = StateRouter(makeSvelteStateRenderer(), document.querySelector(`#target`))

const context = {
	makePath: stateRouter.makePath,
}

states.forEach(createState => stateRouter.addState(createState(context)))

stateRouter.on(`routeNotFound`, (route, parameters) => {
	stateRouter.go(`app.not-found`, Object.assign({ route }, parameters), { replace: true })
})

stateRouter.evaluateCurrentRoute(`home`)
