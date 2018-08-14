import commonjs from 'rollup-plugin-commonjs'
import resolve from 'rollup-plugin-node-resolve'
import babel from 'rollup-plugin-babel'
import svelte from 'rollup-plugin-svelte'
import json from 'rollup-plugin-json'
import sveltePreprocessPostcss from 'svelte-preprocess-postcss'
import progress from 'rollup-plugin-progress'
import builtins from 'rollup-plugin-node-builtins'
import includePaths from 'rollup-plugin-includepaths';

{
	// import rollupPosthtml from 'rollup-plugin-posthtml'
	// import posthtml from 'posthtml'
	// import customElements from 'posthtml-custom-elements'

	// var tags = require('html-tags')
	// var voidTags = require('html-tags/void')

	// import balanced from 'balanced-match'

	// there was a time I tried to use post-html to do HTML transforms, but that doesn't work because Svelte's markup isn't valid html.  Using an AST-based html transformer blows up svelte.

	// function crudeCustomElements(html) {

	// 	let matches = []
	// 	html.replace(/<([^/ >]+)/g, (m, p, l) => matches.push({m, p, l}))

	// 	matches = matches.filter(m => tags.indexOf(m.p) === -1 && 
	// 		voidTags.indexOf(m.p) === -1 && 
	// 		m.p === m.p.toLowerCase() && // lowercase only
	// 		m.p[0] !== '!') // no comments

	// 	var offset = 0
		
	// 	// transform open tags
	// 	for(let i = 0; i < matches.length; i++) {
	// 		let m = matches[i]
			
	// 		console.log(m.p)
			
	// 		let string = `<div class="`+ m.p +`"`
			
	// 		let firsthalf = html.substr(0, m.l+offset)
	// 		let secondhalf = html.substr(m.l+m.m.length+offset)
			
	// 		html = firsthalf + string + secondhalf
			
	// 		offset += string.length - m.m.length
	// 	}
		
	// 	// transform close tags
	// 	for(let i = 0; i < matches.length; i++) {
	// 		let m = matches[i]
	// 		html = html.replace('</'+m.p+'>', '</div>')
	// 	}

	// 	return html
	// }
}

// necessary on windows
let includePathOptions = {
    include: {},
    paths: ['client'],
    external: [],
    extensions: ['.js', '.json', '.html']
}

export default {
	name: `respiratorsStructure`,
	input: `./client/index.js`,
	output: {
		file: `./public/index-bundle.js`,
		format: `iife`,
	},
	sourcemap: true,
	plugins: [
		progress(),
		includePaths(includePathOptions),
		json(),
		svelte({
			preprocess: {
				// markup: ({content}) => {

				// 	return Promise.resolve(posthtml([
				// 			customElements({ 
				// 				defaultTag: 'div',
				// 				skipTags: ['script', 'style', 'Menu', 'category', 'Category']
				// 			})
				// 		])
				// 		.process(content)
				// 		.then(result => {
				// 			// console.log(result/html)
				// 			return { code: result.html }
				// 		}))

				// },
				// markup: ({content}) => {
				// 	var matches = balanced(/<[^>"'{:]+>/, /<\/[^>"'{:]+>/, content)
				// 	return 
				// },
				// markup: ({content}) => ({ code: crudeCustomElements(content) }),
				style: sveltePreprocessPostcss(),
			},
			css(css) {
				css.write(`public/components.css`)
			},
		}),
		resolve({
			browser: true,
			preferBuiltins: true
		}),
		commonjs({
			// include: 'node_modules/**',  // Default: undefined
		}),
		builtins(),
		babel({
			babelrc: false,
			presets: [
				[
					`env`,
					{
						modules: false,
					},
				],
			],
			plugins: [
				`external-helpers`,
			],
			ignore: [
				'client/data/chemicals.json',
				'**/*.json'
			]
		}),
	],
}
