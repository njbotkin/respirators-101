
// var storage = window.WEB ? localStorage : NativeStorage
var storage = localStorage

import { Store } from 'svelte/store.js'
import deepMerge from 'deepmerge'
import { number, unitsPretty } from 'lib/util.js'

const SCHEMA_VERSION = 1

// Makes setting deep properties easier (eg. { job: { chemicalsScrollTop: chemicals.scrollTop } })
class MergeStore extends Store {
	constructor(schema) {
		super(schema)
	}
	set(newState, merge = true) {

		if(!merge) return super.set(newState)

		const oldState = this._state
		const changed = this._changed = {}
		let dirty = false

		for (const key in newState) {
			if (this._computed[key]) throw new Error(`'${key}' is a read-only property`)
			if (this._differs(newState[key], oldState[key])) changed[key] = dirty = true
		}
		if (!dirty) return

		this._set(deepMerge(this._state, newState), changed)
	}
}

// LocalStorage backend
class LocalStore extends MergeStore {
	constructor(storageId, schema) {
		super(schema)

		this.storageId = storageId

		let retrieved = storage.getItem(storageId)
		if(retrieved) {
			retrieved = JSON.parse(retrieved)
			// relieves some headaches during dev, but not a solution for updates in production
			if(retrieved.schema == schema.schema) {
				this._state = retrieved
			}
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
			jobs: {},
			schema: SCHEMA_VERSION
		})

		if(!this._state.job) {
			this.addJob()
		}
	}
	// keep current job and jobs synced
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
	addJob(job) {
		this._state.jobIncrement++

		if(!job) {
			const time = new Date()
			const zeroify = n => String(n).length < 2 ? '0'+n : n

			job = {
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
				concentrations: [],
				twa: {
					samples: [],
					unit: null,
					final: null
				},
				hr: null,
			}
		}

		job.id = this._state.jobIncrement

		this._state.jobs[this._state.jobIncrement] = job
		this._set(this._state, { jobs: true })

		return job.id
	}
	removeJob(id) {
		delete this._state.jobs[id]
		this._set(this._state, { jobs: true })
	}
	duplicateJob(id) {
		let job = Object.assign({}, this._state.jobs[id])
		job.name += ' (Copy)'
		return this.addJob(job)
	}
}

export const store = new JobStore()

// validate/compute job values, keep them consistent
store.on('state', ({current, changed}) => {
	if(!changed.job) return

	let { job } = current

	job.warnings = {}

	if(job.exposureLimit.unit && !job.twa.unit) {
		job.twa.unit = job.exposureLimit.unit
	}

	if(job.exposureLimit.unit) {
		let timeUnitMultiplier = job.exposureLimit.duration > 15 ? 60 : 1
		let timeUnit = timeUnitMultiplier == 1 ? 'Minutes' : 'Hours'
		job.exposureLimit = Object.assign(job.exposureLimit, { timeUnitMultiplier, timeUnit })
	}

	if(!job.twa.samples.length) {
		job.twa = { samples: [], final: null, unit: null }
	}
	else {
		if(!job.twa.unit) {
			job.twa.unit = job.exposureLimit.unit
		}

		if(job.twa.unit !== job.exposureLimit.unit) {
			job.warnings['unit-mismatch'] = `Your Exposure Limit measurement unit (${ unitsPretty[job.exposureLimit.unit] }) doesn't match your TWA measurement unit (${ unitsPretty[job.twa.unit] }).  Your TWA and your HR will be invalid.`
		}

		let validSamples = job.twa.samples.filter(s => !!(number(s.value) && number(s.period)))
		let totalMinutes = validSamples.reduce((a, s) => number(s.period) ? a + (number(s.period) * job.exposureLimit.timeUnitMultiplier) : a, 0)

		let sampleProducts = job.twa.samples.map(s => (number(s.value) && number(s.period)) ? number(s.value) * (number(s.period) * job.exposureLimit.timeUnitMultiplier) : 0)
		// valid =
		// 	if(!$job.exposureLimit.duration) return false
		// 	if(totalMinutes > $job.exposureLimit.duration || totalMinutes < $job.exposureLimit.duration) return false
		// 	for(var t of sampleProducts) { 
		// 		if(t === 0) return false
		// 	} 
		// 	if(twa === Infinity) return false
		// 	return true
		// }
		let totalValueMinutes = sampleProducts.reduce((a, t) => a + t, 0)
		let final = (totalValueMinutes / totalMinutes) || 0 

		if(totalMinutes !== job.exposureLimit.duration) {
			job.warnings['duration-mismatch'] = `The total ${ job.exposureLimit.timeUnit.toLowerCase() } of the TWA samples you've entered is ${ totalMinutes > job.exposureLimit.duration ? 'greater' : 'less' } than the measurement period of the selected exposure limit (${job.exposureLimit.duration / job.exposureLimit.timeUnitMultiplier} ${ job.exposureLimit.timeUnit }).  Your TWA is invalid.`
		}

		job.twa = Object.assign(job.twa, { totalMinutes, sampleProducts, totalValueMinutes, final })

	}

	store.set({ job })

})

export const valueSources = {
	chemical: 'app.chemicals',
	exposureLimit: 'app.chemicals',
	samples: 'app.generate-tabl',
	twa: 'app.calculate-twa',
	hr: 'app.calculate-hr',
}
