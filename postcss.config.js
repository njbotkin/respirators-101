module.exports = {
	plugins: [
		require(`precss`)({
			import: {
				path: [ `client/global-css` ],
				prefix: ``,
			},
		}),
		require(`autoprefixer`),
		require(`postcss-color-function`)
	],
}
