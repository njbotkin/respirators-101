process.chdir('../app');

const { run } = require('runjs')
const runfile = require('../app/runfile.js')
const fs = require('fs')

var logfile = fs.createWriteStream('../build/build.log', { flags: 'a' })
process.stdout.write = process.stderr.write = logfile.write.bind(logfile);

function log(m) {
	console.log({m: Date() + ' ' +m})
}

log('STARTING BUILD')
var started = Date.now()

async function attempt(name, task) {
	log(name)
	try {
		await task()
	}
	catch (e) {
		throw name + ': ' + e
	}
}

async function build() {

	try {

		await attempt('fetching wordpress data', () => 
			new Promise((res) => {
				runfile.fetch_wordpress_data().on('close', res)
			})
		)

		await attempt('converting data', () => 
			Promise.all([
				runfile.build_wordpress_data_to_svelte(),
				runfile.create_symlinks(),
				runfile.glob_all(),
				runfile.process_chemicals()
			])
		)

		await attempt('building files', () => Promise.all([ runfile.build.js(), runfile.build.css() ]))
			
		await attempt('publishing built files', () => 
			run("rsync -azP -e 'ssh -i ../build/thecdeor_id_rsa' public thecdeor@thecde.org:~/public_html/respirators101/app")
		)
		log('success!')
		
	}
	catch(e) {
		log('ABORT: '+e)
	}

	var ended = Date.now()
	var duration = ended - started
	log('took ' + duration/1000 + 's')

}


build()