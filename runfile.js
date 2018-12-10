const { run } = require('runjs')
const creds = require('./remoteserver')
// const buildcreds = require('./buildserver')
const SSH = require('simple-ssh')
const fs = require('fs')
// const gitignore = require('parse-gitignore')

/* DATA */

async function fetch_wordpress_data() {

	if(creds.colocated) {
		// we're on the same server!

		await run("cd ../ && php ~/wp-cli.phar export --skip_comments --stdout > wordpress-data/wordpress.xml")
		await run("cd ../&& php ~/wp-cli.phar option get tablepress_tables > wordpress-data/tablepress_tables.json")

	} else {
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
		fetch_wordpress_data(),
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
	run("curl 'https://cdn.polyfill.io/v2/polyfill.min.js?features=default-3.6,NodeList.prototype.@@iterator,NodeList.prototype.forEach,RegExp.prototype.flags,Object.entries,Object.is,Object.values&flags=always,gated' -H 'User_Agent: Mozilla/5.0 Firefox/900.0' > public/blind-polyfill.js")
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
	icons() {
		run('cd cordova && npx cordova-icon')
		run('cd cordova && npx cordova-splash')
	},
	update_config() { 
		run("cd cordova && npx cordova prepare")
	},
	copy_www() { 
		run("rm -rf cordova/www && mkdir cordova\\www && cp -r public/* cordova/www && node cordova-copy.js")
	},
	files() {
		cordova.copy_www()
		cordova.update_config()
	},

	build_ios() { 
		run("cd cordova && npx cordova build ios")
	},

	// windows env
	build_android() { 
		run("cd cordova && npx cordova build android")
	},
	release_android() { 
		run("cd cordova && npx cordova build android --release")
		run("cp ./cordova/platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk ./app-release-unsigned.apk")
	},
	sign_android() {
		run("jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore upload.jks app-release-unsigned.apk upload")
	},
	zip_android() {
		run("C:\\Users\\Noah\\AppData\\Local\\Android\\Sdk\\build-tools\\27.0.3\\zipalign.exe -v 4 app-release-unsigned.apk app-release.apk")
	},
	install_android() { 
		run("adb install -r cordova/platforms/android/app/build/outputs/apk/debug/app-debug.apk")
		// start emulators too? %programfiles(x86)%\Microsoft Emulator Manager\1.0\emulatorcmd launch /sku:Android /id:0076019F-F03D-41CC-984F-D92FCBD52648
	},
	start_android() {
		run("adb shell monkey -p com.iuoe.respirators101 -c android.intent.category.LAUNCHER 1")
	},
	android() {
		cordova.files()
		cordova.build_android()
		cordova.test_android()
	},
	test_android() {
		cordova.install_android()
		cordova.start_android()
	},
	grab_android() {
		run("cp cordova/platforms/android/build/outputs/apk/debug/android-debug.apk latest.apk")
	}

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
	// push_public,
	// push_app
}