import RespiratorPicker from './RespiratorPicker.html'

import decisionData from 'data/decision-data.json'
import replaceDecisionLinkUrls from 'lib/replace-decision-link-urls'

import { store } from 'lib/storage.js'

const { start, decisions } = decisionData

export default ({ makePath }) => ({
	title: 'Respirator Selection',
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

		let job = store.get().job
		job.RSLStep = params.id
		store.set({ job })

		return Promise.resolve({
			html: replaceDecisionLinkUrls(passage.html, makePath),
			title: passage.title,
			prettyTitle: passage.title.match(/^([^<(:]+)/).pop(),
			prev: passage.prev
		})
	},
})