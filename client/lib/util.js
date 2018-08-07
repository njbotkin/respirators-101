// rounds and adds commas
export function round(v) {
	if(!v || !number(v)) return 0
	v = String(Math.round(v * 100) / 100) 
	let decimal = v.indexOf('.') == -1 ? v.length : v.indexOf('.')
	for(let i = decimal-3; i > 0; i-=3) {
		v = v.substr(0, i) + ',' + v.substr(i)
	}
	return v
}

// serves as a validator and a transformer.  Removes commas
export function number(v) {
	if(!isNaN(v)) return v
	v = v.trim().replace(',', '')
	if(v.length === 0) return false;
	v = Number(v)
	return !isNaN(v) && v
}