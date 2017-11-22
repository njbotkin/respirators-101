const test = require(`tape-catch`)

const convert = require(`./twine-link-to-markdown-link.js`)

const testCases = [{
	inputArgs: [
		`oh [[Show Respirator Options->"Stop on Step 1" options chart]] yeah`,
		{
			'"Stop on Step 1" options chart': 7,
		},
	],
	expected: `oh [Show Respirator Options](7) yeah`,
}, {
	inputArgs: [
		`[[Yes->STEP 1: (YesFire)]]`,
		{
			'STEP 1: (YesFire)': `8`,
		},
	],
	expected: `[Yes](8)`,
}, {
	inputArgs: [
		`[[Yes->  STEP 1: (YesFire)  ]]`,
		{
			'STEP 1: (YesFire)': `8`,
		},
	],
	expected: `[Yes](8)`,
}]

test(`twine-link-to-markdown-link`, t => {
	testCases.forEach(({ inputArgs, expected }) => {
		const output = convert(...inputArgs)
		t.equal(output, expected)
	})

	t.end()
})

test(`Throws when there's no match in the name-to-id map`, t => {
	t.throws(() => convert(`sup [[Dawg->DIGGITY DOG]]`, { irrelevant: `yes` }), /Could not find id/)
	t.end()
})
