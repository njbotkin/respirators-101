import commonjs from 'rollup-plugin-commonjs'
import resolve from 'rollup-plugin-node-resolve'
import babel from 'rollup-plugin-babel'
import svelte from 'rollup-plugin-svelte'
import string from 'rollup-plugin-string'
import json from 'rollup-plugin-json'
import postcss from 'postcss'

export default {
	name: `respiratorsStructure`,
	input: `./client/index.js`,
	output: {
		file: `./public/index-bundle.js`,
		format: `iife`,
	},
	sourcemap: true,
	plugins: [
		string({
			include: `**/static-html/**/*.html`,
		}),
		json(),
		svelte({

			exclude: `**/static-html/**/*.html`,

			preprocess: {
				style({ content }) {
					return Promise.resolve(postcss([
						require(`precss`)({
							import: {
								path: [ `client/global-css` ],
								prefix: ``,
							},
						}),
						require(`autoprefixer`),
					])
						.process(content)
						.then(result => {
							return { code: result }
						}))
				},
			},

			css(css) {
				css.write(`public/components.css`)
			},

		}),
		commonjs(),
		resolve({
			browser: true,
		}),
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
		}),
	],
}
