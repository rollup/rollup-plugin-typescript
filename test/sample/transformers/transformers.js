const ts = require('typescript');

const guardedAccess = (/* options */) => (context) => (sourceFile) => {
	const visitor = (node) => {
		if (ts.isCallExpression(node) &&
			node.expression.getText(sourceFile) === 'get') {
			const [obj, path, defaultValue] = node.arguments;
			// check to make sure it is the expected argument types
			if (ts.isArrayLiteralExpression(path)) {
				// return a binary expression like a && a.b && a.b.c || defaultValue
				return ts.createBinary(
					// the gaurded access
					path.elements.reduce((prev, elem) => [
						...prev,
						ts.createElementAccess(prev[prev.length - 1], ts.visitNode(elem, visitor))
					], [obj]).reduce((prev, elem) => ts.createBinary(
						prev,
						ts.SyntaxKind.AmpersandAmpersandToken,
						elem
					)),
					// the || operator
					ts.SyntaxKind.BarBarToken,
					defaultValue
				);
			}
		}
		// otherwise continue visiting all the nodes
		return ts.visitEachChild(node, visitor, context);
	};

	return ts.visitNode(sourceFile, visitor);
};

const void0 = (/* options */) => (context) => (sourceFile) => {
	const visitor = (node) => {
		if (ts.isIdentifier(node) &&
			node.getText(sourceFile) === 'undefined') {
			// return `void 0` instead
			return ts.createVoidZero();
		}
		// otherwise continue visiting all the nodes
		return ts.visitEachChild(node, visitor, context);
	};

	return ts.visitNode(sourceFile, visitor);
};

exports.guardedAccess = guardedAccess;
exports.void0 = void0;
