import TWA from './TWA.html'

export default () => ({
	title: 'Calculate TWA',
	name: `app.calculate-twa`,
	route: `calculate/twa`,
	template: TWA,
	querystringParameters: [ `hours`, `samples` ],

	resolve(data, params) { 
		var samples = []

		if(params.samples) {
			for(; params.samples > 0; params.samples--) {
				samples.push({
					ppm: '',
					hours: ''
				})
			}
		}
		return Promise.resolve({
			hours: params.hours,
			samples
		})
	}
})
