import test from 'tape'

import pathToId from './path-to-id.js'

test(`Works for a basic test I thought of`, t => {
	t.equal(pathToId(`some/route/and-then-stuff.html`), `and-then-stuff`)

	t.end()
})
