import MCMUC from './MCMUC.html'

export default () => ({
	title: 'Calculate Multi-component MUC',
	name: `app.calculate-mcmuc`,
	route: `calculate/mcmuc`,
	template: MCMUC,
	querystringParameters: [ `concentrations` ],

	resolve(data, params) { 
		var concentrations = []

		if(params.concentrations) {
			for(; params.concentrations > 0; params.concentrations--) {
				concentrations.push({
					ppm: '',
					muc: ''
				})
			}
		}
		return Promise.resolve({
			concentrations
		})
	}
})
