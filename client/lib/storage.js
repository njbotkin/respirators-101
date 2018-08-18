
// var storage = window.WEB ? localStorage : NativeStorage
var storage = localStorage

import { Store } from 'svelte/store.js'
import merge from 'deepmerge'

// Makes setting deep properties easier (eg. { job: { chemicalsScrollTop: chemicals.scrollTop } })
class MergeStore extends Store {
	constructor(schema) {
		super(schema)
	}
	set(newState) {
		const oldState = this._state
		const changed = this._changed = {}
		let dirty = false

		for (const key in newState) {
			if (this._computed[key]) throw new Error(`'${key}' is a read-only property`)
			if (this._differs(newState[key], oldState[key])) changed[key] = dirty = true
		}
		if (!dirty) return

		this._set(merge(this._state, newState), changed)
	}
}

// LocalStorage backend
class LocalStore extends MergeStore {
	constructor(storageId, schema) {
		super(schema)

		this.storageId = storageId

		let retrieved = storage.getItem(storageId)
		if(retrieved) {
			this._state = JSON.parse(retrieved)
		}
	}
	_set(newState, changed) {
		super._set(newState, changed)
		storage.setItem(this.storageId, JSON.stringify(this._state))
	}
}

class JobStore extends LocalStore {
	constructor() {
		super('store', {
			jobIncrement: 0,
			job: null,
			jobs: {}
		})

		if(!this._state.job) {
			this.addJob()
		}
	}
	_set(newState, changed) {

		// keep job and jobs synced
		if(this._state.job) {
			if(changed.job && !changed.jobs) {
				newState.jobs = this._state.jobs
				newState.jobs[newState.job.id] = newState.job
				changed.jobs = true
			}
			if(!changed.job && changed.jobs) {
				if(newState.jobs[this._state.job.id]) {
					newState.job = newState.jobs[this._state.job.id]
					changed.job = true
				} else {
					// job deleted
					newState.job = null
					changed.job = true
				}
			}
		}

		// if no current job, set one
		if(newState.jobs) {
			let jobsArr = Object.keys(newState.jobs)
			if(jobsArr.length > 0) {
				if(!newState.job) {
					newState.job = newState.jobs[jobsArr[jobsArr.length-1]]
					changed.job = true
				}
			}
		}

		super._set(newState, changed)
	}
	switchJob(id) {
		this._state.job = this._state.jobs[id]
		this._set(this._state, { job: true})
	}
	addJob() {
		this._state.jobIncrement++

		const time = new Date()
		const zeroify = n => String(n).length < 2 ? '0'+n : n

		this._state.jobs[this._state.jobIncrement] = {
			id: this._state.jobIncrement,
			date: `${time.getFullYear()}-${zeroify(time.getMonth())}-${zeroify(time.getDate())}`,
			name: 'New Job',
			openChemicals: {},
			chemicalsScrollTop: 0,
			chemical: null,
			exposureLimit: {
				formKey: NaN,
				standardKey: NaN,
				durationKey: NaN,
				duration: NaN,
				value: NaN,
				unit: NaN
			},
			samples: [],
			concentrations: [],
			twa: null,
			hr: null,
		}
		this._set(this._state, { jobs: true })
	}
	removeJob(id) {
		delete this._state.jobs[id]
		this._set(this._state, { jobs: true })
	}
}

export const store = new JobStore()

export const valueSources = {
	chemical: 'app.chemicals',
	exposureLimit: 'app.chemicals',
	samples: 'app.generate-tabl',
	twa: 'app.calculate-twa',
	hr: 'app.calculate-hr',
}
