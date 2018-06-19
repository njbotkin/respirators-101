import RespiratorIntroduction from './RespiratorIntroduction.html'

import { getStep } from 'lib/storage'

export default () => ({
	title: 'Respirator Selection',
	name: `app.respirator-introduction`,
	route: `/respirator-introduction`,
	template: RespiratorIntroduction
})