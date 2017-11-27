const test = require(`tape`)
const modify = require(`./add-ul-answer-links-class`)

test(`Sets a class on an unordered list that contains nothing but links`, t => {
	const input = `<p>Will you use the respirator in an oxygen-deficient<sup>*</sup> atmosphere?</p>
<ul>
<li><a href="7">Yes</a></li>
<li><a href="3">No</a></li>
</ul>`

	const expected = `<p>Will you use the respirator in an oxygen-deficient<sup>*</sup> atmosphere?</p>
<ul class="answer-links">
<li><a href="7">Yes</a></li>
<li><a href="3">No</a></li>
</ul>`

	const output = modify(input)

	t.equal(output, expected)

	t.end()
})

test(`Don't touch lists with items that contain anything other than a link`, t => {
	const input = `<p>Will you use the respirator in an oxygen-deficient<sup>*</sup> atmosphere?</p>
<ul>
<li>Yes</li>
<li><a href="3">No</a></li>
</ul>`

	const expected = `<p>Will you use the respirator in an oxygen-deficient<sup>*</sup> atmosphere?</p>
<ul>
<li>Yes</li>
<li><a href="3">No</a></li>
</ul>`

	const output = modify(input)

	t.equal(output, expected)

	t.end()
})
