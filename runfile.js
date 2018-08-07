const { run } = require('runjs')
const creds = require('./remoteserver')
// const buildcreds = require('./buildserver')
const SSH = require('simple-ssh')
const fs = require('fs')
// const gitignore = require('parse-gitignore')

/* DATA */

function fetch_wordpress_data() {

	var ssh = new SSH(creds)
		.on('ready', () => console.log('connection opened to '+creds.user+'@'+creds.host))
		.on('close', () => console.log('connection closed'))
		
	ssh
		.exec("cd "+creds.path+" && php ~/wp-cli.phar export --skip_comments --stdout", {
			start: () => console.log('fetching XML export'),
			exit: (code, stdout) => fs.writeFileSync('wordpress-data/wordpress.xml', stdout)
		})
		.exec("cd "+creds.path+" && php ~/wp-cli.phar option get tablepress_tables", {
			start: () => console.log('fetching tablepress config JSON'),
			exit: (code, stdout) => fs.writeFileSync('wordpress-data/tablepress_tables.json', stdout)
		})
	.start()
	return ssh
}

function fetch_chemical_data() {
	run('wget -O chemical-data/chemicals.json https://wwwn.cdc.gov/niosh-npg/assets/chemicals2.json')
	run('wget -O chemical-data/z1.html https://www.osha.gov/dsg/annotated-pels/tablez-1.html')
	run('wget -O chemical-data/z2.html https://www.osha.gov/dsg/annotated-pels/tablez-2.html')
	run('wget -O chemical-data/z3.html https://www.osha.gov/dsg/annotated-pels/tablez-3.html')
}

function build_twine_data_to_decisions_html() { 
	run("node twine-parser/output-decisions-html-object.js")
}

function build_wordpress_data_to_svelte() { 
	run("node wordpress-parser/xml-to-svelte.js")
}

function process_chemicals() { 
	run("node chemical-processor/index.js")
}

async function glob_all() {
	await Promise.all([ glob.routes(), glob.content() ])
}

const glob = {
	routes() {
		run("glob-module-file --pattern=\"client/routes/**/*.js\" --format=es --pathPrefix=../../ --outputPath=client/data/globbed-routes.js")
	},
	content() {
		run("glob-module-file --pattern=\"client/data/content/*.html\" --format=es --pathPrefix=../../ --exportWithPath --outputPath=client/data/globbed-content.js")
	}
}


/* ASSETS */
function create_symlinks() { 
	run("symlink client/lib client/node_modules/lib && symlink client/data client/node_modules/data")
}

async function prep_build() { 
	await Promise.all([
		build_twine_data_to_decisions_html(),
		build_wordpress_data_to_svelte(),
		process_chemicals(),
		create_symlinks(),
		glob_all()
	])
}

async function build_all() {
	prep_build()
	await Promise.all([ build.js(), build.css() ])
}

const build = {
	js() {
		run("rollup -c")
	},
	css() {
		run("postcss-alt \"client/routes/**/*.css\" \"./public/style.css\"")
	}
}

// requires patched polyfill-server running locally
function fetch_blind_polyfill() { 
	run("curl 'http://127.0.0.1:3000/v2/polyfill.min.js?features=default-3.6,NodeList.prototype.@@iterator,NodeList.prototype.forEach,RegExp.prototype.flags&flags=always,gated' -H 'User_Agent: Mozilla/5.0 Firefox/900.0' > public/blind-polyfill.js")
}

function fetch_google_fonts() { 
	run("npx goofoffline outDir=public/fonts \"https://fonts.googleapis.com/css?family=Roboto+Condensed\" \"https://fonts.googleapis.com/css?family=Open+Sans:400,600\"")
}


/* TEST */
function test() { 
	run("tape -r reify ./**/*-test.js")
}


/* DEV */
function dev_server() { 
	run("live-server public --no-browser", {
		async: true
	})
}

function dev() {
	watch_all()
	dev_server()
}

function watch_all() {
	watch.js()
	watch.css()
}

const watch = {
	js() {
		run("rollup -c -w", {
			async: true
		})
	},
	css() {
		run("postcss-alt \"client/routes/**/*.css\" \"./public/style.css\" --watch=\"client/**/*.css\"", {
			async: true
		})
	}
}


/* CORDOVA */
const cordova = {

	// unix env required
	init() { 
		run("cd cordova && npx cordova platform add android && npx cordova platform add ios")
	},
	update_config() { 
		run("cd cordova && npx cordova prepare")
	},
	copy_www() { 
		run("rm -rf cordova/www; mkdir cordova/www && cp -r public/* cordova/www && node cordova-copy.js")
	},

	build_ios() { 
		run("cd cordova && npx cordova build ios")
	},

	// windows env
	build_android() { 
		run("cd cordova && npx cordova build android")
	},
	test_android() { 
		run("adb -s 169.254.76.233:5555 install -r cordova/platforms/android/build/outputs/apk/debug/android-debug.apk")
		// start emulators too? %programfiles(x86)%\Microsoft Emulator Manager\1.0\emulatorcmd launch /sku:Android /id:0076019F-F03D-41CC-984F-D92FCBD52648
	},
	grab_android() {
		run("cp cordova/platforms/android/build/outputs/apk/debug/android-debug.apk latest.apk")
	}

}

function android_all() {
	cordova.build_android()
	cordova.test_android()
}

// window 
// function push_public() {
// 	run("rsync -W public "+creds.user+"@"+creds.host+":"+creds.path+"/app")
// }

// function push_app() {
// 	let exclude = gitignore('.gitignore', ['.git', 'cordova', 'public']).reduce((a, e) => a+' --exclude "'+e+'"', '')
// 	run("rsync -vv -azP --links --safe-links "+exclude+" -e 'ssh -i ~/.ssh/wsl_id_rsa' ./ " +buildcreds.user+"@"+buildcreds.host+":"+buildcreds.path)
// }

module.exports = {
	test,
	prep_build,
	build_all,
	build,
	watch_all,
	watch,
	glob_all,
	glob,
	create_symlinks,
	build_twine_data_to_decisions_html,
	build_wordpress_data_to_svelte,
	fetch_wordpress_data,
	process_chemicals,
	fetch_chemical_data,
	dev_server,
	dev,
	fetch_blind_polyfill,
	fetch_google_fonts,
	cordova,
	android_all,
	// push_public,
	// push_app
}