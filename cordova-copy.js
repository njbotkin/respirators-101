const pify = require(`pify`)
const { readFile, writeFile } = pify(require(`fs`))
const replace = require(`better-replace`)
const r = require(`regex-fun`)

const browserCode = r.combine(`<!-- start browser -->`, /(?:.|\n)+?/, `<!-- end browser -->`)
const cordovaCode = r.combine(`<!-- cordova only`, /((?:.|\n)+?)/, `-->`)

const removeBrowserCode = html => replace(browserCode, () => ``, html)
const uncommentCordovaCode = html => replace(cordovaCode, code => code, html)

async function main() {
	const html = await readFile(`public/index.html`, { encoding: `utf8` })

	const output = uncommentCordovaCode(removeBrowserCode(html))

	await writeFile(`cordova/www/index.html`, output)
}

main().catch(e => process.nextTick(() => {
	throw e
}))

