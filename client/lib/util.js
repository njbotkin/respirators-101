// rounds and adds commas, add fake decimal to imply precision
export function round(v) {
	if(typeof v === 'undefined' || !number(v)) return 0
	v = String(Math.round(v * 10000) / 10000) 

	let decimal
	if(v.indexOf('.') == -1) {
		v += '.0'
		decimal = v.length - 2
	} else {
		decimal = v.indexOf('.')
	}

	for(let i = decimal-3; i > 0; i-=3) {
		v = v.substr(0, i) + ',' + v.substr(i)
	}
	return v
}

// serves as a validator and a transformer.  Removes commas
export function number(v) {
	if(typeof v === 'undefined') return false
	if(!isNaN(v)) return Number(v)
	v = v.trim().replace(',', '')
	if(v.length === 0) return false
	v = Number(v)
	return !isNaN(v) && v
}

export const unitsPretty = {
	ppm: 'PPM',
	mgm3: 'mg/m<sup>3</sup>',
	mg10m3: 'mg/10m<sup>3</sup>',
	fcm3: 'f/cm<sup>3</sup>',
	fiberscm3: 'fibers/cm<sup>3</sup>',
	mppcf: 'mppcf',
	vm3: 'V/m<sup>3</sup>',
	mgvm3: 'mg V/m<sup>3</sup>',
	mgv2o5m3: 'mg V<sub>2</sub>O<sub>5</sub>/m<sup>3</sup>',
	pahsm3: 'mg PAHs/m<sup>3</sup>',
	mgcro3: 'mg CrO<sup>3</sup>'
}

export function durationsPretty(duration, standard) {
	let s = {
		osha_pel: "PEL",
		cal_osha_pel: "PEL",
		niosh_rel: "REL",
		msha_pel: "PEL"
	}
	return ({
		default: s[standard],
		default1: s[standard],
		default2: s[standard],
		ceiling: "Ceiling",
		stel: "STEL",
		excursion: "Excursion"
	})[duration]
}

export function arraySame(a, b) {
	for(let i = 0; i < a.length; i++) if(a[i] !== b[i]) return false
	return true
}

export function EL_is_current(el, jel) {
	if(!jel.chemical || !el.chemical) return false
	return arraySame([ el.chemical.name, el.standardKey, el.formKey ], [ jel.chemical.name, jel.standardKey, jel.formKey ])
}