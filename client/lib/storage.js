
// var storage = window.WEB ? localStorage : NativeStorage
var storage = localStorage

import { Store } from 'svelte/store.js'
// import merge from 'deepmerge'

// // Store with LocalStorage backend
// class LocalStore extends Store {
// 	constructor(storageId, schema) {
// 		super(schema)

// 		this.storageId = storageId

// 		let retrieved = storage.getItem(storageId)
// 		if(retrieved) {
// 			super.set(JSON.parse(retrieved))
// 		}
// 	}
// 	set(o) {
// 		super.set(o)
// 		storage.setItem(this.storageId, JSON.stringify(super.get()))
// 	}
// }

// class JobStore extends LocalStore {
// 	constructor(jobId) {

// 	}
// }

var jobsString = storage.getItem('jobs')
export var jobManager

if(jobsString) {
	jobManager = JSON.parse(jobsString)
} else {
	jobManager = {
		jobIncrement: 0,
		currentJobId: null,
		jobs: {}
	}
}

var currentJob = new Store()
export var job = currentJob

currentJob.on('state', ({current}) => {
	jobManager.jobs[current.id] = current
	saveJobs()
})

if(jobManager.currentJobId) {
	currentJob.set(jobManager.jobs[jobManager.currentJobId])
} else {
	addJob()
	saveJobs()
}
function saveJobs() {
	storage.setItem('jobs', JSON.stringify(jobManager))
}


export function switchJob(id) {
	jobManager.currentJobId = id
	currentJob.set(jobManager.jobs[id])
	saveJobs()
}

export function addJob() {
	jobManager.jobIncrement++
	jobManager.jobs[jobManager.jobIncrement] = {
		id: jobManager.jobIncrement,
		date: new Date(),
		openChemicals: []
	}

	if(jobManager.currentJobId == null) {
		switchJob(jobManager.jobIncrement)
	}
}

export function removeJob(id) {
	delete jobManager.jobs[id]

	let jobsArr = Object.keys(jobManager.jobs)

	if(jobsArr.length == 0) {
		jobManager.currentJobId = null
		saveJobs()
	} else if(id == jobManager.currentJobId) {
		switchJob(jobManager.jobs[jobsArr[0]].id)
	}
}

export function setJobManager(jm) {
	jobManager = jm
	saveJobs()
}




// const allJobs = []

// class JobStore extends LocalStore {
// 	constructor(storageId) {
// 		super(storageId, {
// 			jobIncrement: 0,
// 			currentJobId: null,
// 			jobs: {}
// 		})
// 	}
// 	set(obj) {
// 		super.set(merge(this.get(), obj))
// 	}
// 	addJob() {
// 		let state = this.get()
// 		let jobIncrement = state.jobIncrement+1
// 		let currentJobId = state.currentJobId ? state.currentJobId : jobIncrement

// 		state.jobs[jobIncrement] = {
// 			date: new Date()
// 		}

// 		super.set( state )
// 		super.set({ jobIncrement })
// 		super.set({ currentJobId })
// 	}
// 	removeJob(id) {
// 		let state = this.get()
// 		delete state.jobs[id]

// 		let currentJobId = state.currentJobId == id ? null : state.currentJobId

// 		super.set(state)
// 		super.set({ currentJobId })
// 	}
// 	get currentJob() {
// 		let state = this.get()
// 		if(state.currentJobId) {
// 			return state.jobs[state.currentJobId]
// 		}
// 		return {}
// 	}
// 	updateCurrentJob(obj) {
// 		if(!this.get().currentJobId) {
// 			this.addJob()
// 		}

// 		let jobs = {}
// 		jobs[this.get().currentJobId] = obj

// 		this.set({ jobs })
// 	}
// }

// const jobs = []

// class JobManager extends LocalStore {
// 	constructor(storageId) {
// 		super(storageId, {
// 			jobIncrement: 0,
// 			currentJobId: null,
// 			jobs: []
// 		})

// 		// no jobs yet.  Create a default
// 		if(this.get().jobIncrement == 0) {
// 			this.addJob()
// 		}
// 	}
// 	addJob() {
// 		let i = this.get().jobIncrement + 1
// 		this.set({jobIncrement: i})
// 		new LocalStore(i)
// 	}
// 	get currentJob() {
// 		return 
// 	}

// }



// export const jobs = new JobManager('jobManager')
// export const currentJob = new jobs.currentJob

// class JobStore extends Store {
// 	constructor(obj) {
// 		super(obj)
// 		this.on('state', () => jobs.save())
// 	}
// }

/*class Jobs {
	constructor() {
		this.currentJobId = null
		this.jobIncrementor = 0

		this.restore()
	}
	addJob(name) {
		this.jobs[++this.jobIncrementor] = new JobStore({ name })

		if(this.currentJobId === null) {
			this.currentJobId = this.jobIncrementor
		}
		this.save()
	}
	removeJob(id) {
		delete this.jobs[id]

		console.log(id, this.currentJobId)

		if(this.currentJobId == id) {
			this.currentJobId = null
		}
		this.save()
	}
	get currentJob() {
		return this.currentJobId ? this.jobs[this.currentJobId].get() : {}
	}
	currentJobSet(obj) {
		if(!this.currentJobId) {
			this.addJob()
		}
		return this.jobs[this.currentJobId].set(obj)
	}
	serializeJobs() {
		let jobs = {}

		for(let key in this.jobs) {
			jobs[key] = this.jobs[key].get()
		}

		return jobs
	}
	save() {
		var state = {}
		Object.assign(state, this)

		state.jobs = this.serializeJobs()

		storage.setItem('state', JSON.stringify(state))
	}
	restore() {
		var state = JSON.parse(storage.getItem('state'))
		Object.assign(this, state)

		this.jobs = {}

		for(let key in state.jobs) {
			this.jobs[key] = new JobStore(state.jobs[key])
		}
	}
}

export const jobs = new Jobs()*/