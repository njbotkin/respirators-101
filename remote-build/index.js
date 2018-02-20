const express = require('express')
const fs = require('fs')
const { fork } = require('child_process');

var logfile = fs.createWriteStream('../build/build.log', { flags: 'a' })
process.stdout.write = process.stderr.write = logfile.write.bind(logfile);

process.chdir('../app');

var building = false

function build() {

	building = true
	const forked = fork('../build/build.js')

	const dots = setInterval(() => {
		process.stdout.write('.')
	}, 500)

	var prevTime

	forked.on('message', (m) => {
		var duration =  prevTime ? ((Date.now() - prevTime)/1000) + 's' : ''
		process.stdout.write(' ' + duration + '\n' + m.m)
		prevTime = Date.now()
	})

	forked.on('exit', (code) => {
		building = false
		clearInterval(dots)
		if(code !== 0) console.log('\nexited with', code)
	})

}

// listen for build requests
const server = express()
// the shared host only allows outbound traffic to ports 80 and 443 ...
server.listen(443, () => console.log(Date(), 'server listening on port 443')) 

server.get('/buildkthx', (req, res, next) => {
	if(!building) {
		res.sendStatus(200)
		build()
	} else {
		res.sendStatus(304)
	}
	next()
})
