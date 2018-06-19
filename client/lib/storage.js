
// var storage = window.WEB ? localStorage : NativeStorage
var storage = localStorage

if(!storage.getItem('currentSession')) {
	setSession({})
}

export function currentSession() {
	return JSON.parse(storage.getItem('currentSession'))
}

export function setSession(obj) {
	return storage.setItem('currentSession', JSON.stringify(obj))
}

export function setStep(id) {
	var session = currentSession()
	session.step = id
	setSession(session)
}

export function getStep() {
	return currentSession().step
}