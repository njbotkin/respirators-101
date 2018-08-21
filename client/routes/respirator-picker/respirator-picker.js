import RespiratorPicker from './RespiratorPicker.html'

import decisionData from 'data/decision-data.json'
import replaceDecisionLinkUrls from 'lib/replace-decision-link-urls'

import { store } from 'lib/storage.js'

const { start, decisions } = decisionData

export default ({ makePath }) => ({
	name: `app.respirator-picker`,
	route: `/respirator-picker`,
	template: RespiratorPicker,
	querystringParameters: [ `id` ],
	defaultParameters: {
		id: start,
	},
	resolve(data, params) {
		const passage = decisions[params.id]

		if (!passage) {
			return Promise.reject({
				redirectTo: {
					name: `app.not-found`,
					params: {
						route: `/respirator-picker`,
						parameters: JSON.stringify(params),
					},
				},
			})
		}
		
		store.set({ job: { RSLStep: params.id } })

		return Promise.resolve({
			html: replaceDecisionLinkUrls(passage.html, makePath),
		})
	},
	activate(context) {

		let store = context.domApi.store
		let params = context.parameters
		let makePath = context.domApi._state.asr.makePath

		const passage = decisions[params.id]

		store.set({ nav: {
			title: 'Respirator Selection',
			sub: {
				title: passage.title.match(/^([^<(:]+)/).pop(),
				prev: makePath('app.respirator-picker', {id: passage.prev})
			}
		} }, false)
	}
})