import StateRouter from 'abstract-state-router'
import makeSvelteStateRenderer from 'svelte-state-renderer'

import states from 'lib/globbed-routes.js'

const stateRouter = StateRouter(makeSvelteStateRenderer(), document.querySelector('#target'))

states.forEach(state => stateRouter.addState(state))

stateRouter.evaluateCurrentRoute('home')
