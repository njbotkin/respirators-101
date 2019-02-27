import StaticContent from './Content.html'

import idToPage from 'lib/static-content-by-id.js'

import decisionData from 'data/decision-data.json'
const { start, decisions } = decisionData


export default () => ({
	name: `app.options-list`,
	route: `/options/:id(.+)`,
	template: StaticContent,
	resolve(data, params) {
		const page = idToPage[params.id] 

		if (!page) {
			return Promise.reject({
				redirectTo: {
					name: `app.not-found`,
					params: {
						route: `/options/${ params.id }`,
					},
				},
			})
		}

		const { component } = page

		return Promise.resolve({
			component
		})
	},
	activate(context) {

		let store = context.domApi.store
		let params = context.parameters
		let makePath = context.domApi._state.asr.makePath
		const passage = decisions['#/options/'+params.id]

		if(store.get().job.options !== params.id) {
			let { job } = store.get()
			job.options = params.id
			job.options_saved = {}
			store.set({ job })
		}

		store.set({ nav: {
			title: 'Respirator Selection',
			sub: {
				title: 'Acceptable Respirator Options',
				prev: makePath('app.respirator-picker', {id: passage.prev})
			}
		} }, false)
	}
})
