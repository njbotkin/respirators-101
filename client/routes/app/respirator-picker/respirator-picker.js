import RespiratorPicker from './RespiratorPicker.html'

import decisionData from 'data/decision-data.json'
import replaceDecisionLinkUrls from 'lib/replace-decision-link-urls'

const { start, decisions } = decisionData

export default ({ makePath }) => ({
	name: `wrapper.app.respirator-picker`,
	route: `/respirator-picker`,
	template: RespiratorPicker,
	querystringParameters: [ `id` ],
	defaultParameters: {
		id: start,
	},
	resolve(data, params) {
		const html = decisions[params.id]

		if (!html) {
			return Promise.reject({
				redirectTo: {
					name: `wrapper.app.not-found`,
					params: {
						route: `/respirator-picker`,
						parameters: JSON.stringify(params),
					},
				},
			})
		}

		const title = html.match(/<h2>([^<(]+)(?:[^<]+?)<\/h2>/).pop()

		return Promise.resolve({
			html: replaceDecisionLinkUrls(html, makePath),
			title			
		})
	},
})