import NotFound from './NotFound.html'

export default {
	name: `app.not-found`,
	route: `not-found`,
	querystringParameters: [ `route`, `parameters` ],
	template: NotFound,
	resolve(data, params) {
		const { route, parameters } = params

		return Promise.resolve({ route, parameters })
	},
}
