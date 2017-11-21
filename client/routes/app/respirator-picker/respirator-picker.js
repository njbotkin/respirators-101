import RespiratorPicker from './RespiratorPicker.html'

import decisionData from 'lib/decision-data.json'
import replaceDecisionLinkUrls from 'lib/replace-decision-link-urls'

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
		const html = decisions[params.id]

		if (!html) {
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

		return Promise.resolve({
			html: replaceDecisionLinkUrls(html, makePath),
		})
	},
})
