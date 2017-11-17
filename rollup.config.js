import commonjs from 'rollup-plugin-commonjs'
import resolve from 'rollup-plugin-node-resolve'
import babel from 'rollup-plugin-babel'
import svelte from 'rollup-plugin-svelte'
import string from 'rollup-plugin-string'

export default {
	name: 'revelationStructure',
	input: './client/index.js',
	output: {
		file: './public/index-bundle.js',
		format: 'iife',
	},
	sourcemap: true,
	plugins: [
		string({
			include: '**/static-html/**/*.html',
		}),
		svelte({
			exclude: '**/static-html/**/*.html',
		}),
		commonjs(),
		resolve({
			browser: true,
		}),
		babel({
			babelrc: false,
			presets: [
				[
					'env',
					{
						modules: false,
					},
				],
			],
			plugins: [
				'external-helpers',
			],
		}),
	],
}
