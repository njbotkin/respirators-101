const { parseFragment, serialize } = require(`parse5`)

module.exports = html => {
	const parsed = parseFragment(html)

	// console.log(parsed)

	const altered = transformRecursively(parsed, allTransforms(
		addAnswerLinksClass
	))

	return serialize(altered)
}

const tagIs = tagName => node => node.tagName === tagName
const nodeIs = nodeName => node => node.nodeName === nodeName
const either = (thisCondition, thatCondition) => node => thisCondition(node) || thatCondition(node)

const allConditionsMatch = (...conditions) => node =>
	conditions.every(condition => condition(node))
const allChildrenMatch = condition => node =>
	!!node.childNodes && node.childNodes.every(condition)
const allTransforms = (...transforms) => node =>
	transforms.reduce((acc, transform) => transform(acc), node)

const makeConditionalTransform = (condition, transform) => node => condition(node)
	? transform(node)
	: node

const textOr = condition => either(nodeIs(`#text`), condition)

const addAnswerLinksClass = makeConditionalTransform(
	allConditionsMatch(tagIs(`ul`), allChildrenMatch(textOr(allChildrenMatch(tagIs(`a`))))),
	node => addClass(node, `answer-links`)
)

function transformRecursively(node, transform) {
	const transformed = transform(node)

	// console.log(transformed)

	if (node.childNodes) {
		const transformedChildren = node.childNodes.map(child =>
			transformRecursively(child, transform)
		)

		return Object.assign({}, transform(node), {
			childNodes: transformedChildren,
		})
	} else {
		return transformed
	}
}

function addClass(node, classString) {
	if (node.attrs.some(({ name }) => name === `class`)) {
		return node.attrs.map(attribute => {
			if (attribute.name === `class`) {
				return {
					name: `class`,
					value: addClassToString(attribute.value, classString),
				}
			} else {
				return attribute
			}
		})
	} else {
		return Object.assign({}, node, {
			attrs: [{ name: `class`, value: classString }],
		})
	}
}

function addClassToString(classString, newClass) {
	const classes = new Set(classString.split(/ */))
	classes.add(newClass)
	return [ ...classes ].join(` `)
}
