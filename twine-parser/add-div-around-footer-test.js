const test = require(`tape`)
const modify = require(`./add-div-around-footer`)

test(`Everything after the <hr> goes into a div with a class`, t => {
	const input = `<p>Will you use the respirator in an oxygen-deficient<sup>*</sup> atmosphere?</p>
<ul>
<li><a href="7">Yes</a></li>
<li><a href="3">No</a></li>
</ul>
<hr>
<p><sup>*</sup>Oxygen deficient is less than 19.5% oxygen.</p>`

	const expected = `<p>Will you use the respirator in an oxygen-deficient<sup>*</sup> atmosphere?</p>
<ul>
<li><a href="7">Yes</a></li>
<li><a href="3">No</a></li>
</ul>
<div class="decision-footer">
<p><sup>*</sup>Oxygen deficient is less than 19.5% oxygen.</p>
</div>`

	const output = modify(input)

	t.equal(output, expected)

	t.end()
})
