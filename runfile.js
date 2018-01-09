const { run } = require('runjs')


/* DATA */
function build_twine_data_to_decisions_html() { 
	run("node twine_parser/output_decisions_html_object.js")
}

function build_wordpress_data_to_svelte() { 
	run("node wordpress_parser/xml_to_svelte.js")
}

async function glob_all() {
	await Promise.all([ glob.js(), glob.css() ])
}

const glob = {
	routes() {
		run("glob-module-file --pattern=\"client/routes/**/*.js\" --format=es --pathPrefix=../../ --outputPath=client/data/globbed_routes.js")
	},
	content() {
		run("glob-module-file --pattern=\"client/data/content/*.html\" --format=es --pathPrefix=../../ --exportWithPath --outputPath=client/data/globbed_content.js")
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
	run("curl 'http://127.0.0.1:3000/v2/polyfill.min.js?features=default-3.6,NodeList.prototype.@@iterator,NodeList.prototype.forEach,RegExp.prototype.flags&flags=always,gated' -H 'User_Agent: Mozilla/5.0 Firefox/900.0' > public/blind_polyfill.js")
}



/* TEST */
function test() { 
	run("tape -r reify ./**/*-test.js")
}


/* DEV */
function dev_server() { 
	run("live-server public")
}

async function dev() { 
	prep_build()
	watch_all()
	dev_server()
}

async function watch_all() {
	await Promise.all([ watch.js(), watch.css() ])
}

const watch = {
	js() {
		run("rollup -c -w")
	},
	css() {
		run("postcss-alt \"client/routes/**/*.css\" \"./public/style.css\" --watch=\"client/**/*.css\"")
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
		run("rm -rf cordova/www; mkdir cordova/www && cp -r public/* cordova/www && node cordova_copy.js")
	},

	build_ios() { 
		run("cd cordova && npx cordova build ios")
	},

	// windows env
	build_android() { 
		run("cd cordova && npx cordova build android")
	},
	test_android() { 
		run("adb -s ZY223MJ3P7 install -r cordova/platforms/android/build/outputs/apk/debug/android_debug.apk")
	}

}

function android_all() {
	cordova.build_android()
	cordova.test_android()
}

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
	dev_server,
	dev,
	fetch_blind_polyfill,
	cordova,
	android_all
}