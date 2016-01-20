var assert = require( 'assert' );
var rollup = require( 'rollup' );
var typescript = require( '..' );

process.chdir( __dirname );

// Evaluate a bundle (as CommonJS) and return its exports.
function evaluate( bundle ) {
	const module = { exports: {} };

	new Function( 'module', 'exports', bundle.generate({ format: 'cjs' }).code )(module, module.exports);

	return module.exports;
}

describe( 'rollup-plugin-typescript', function () {
	this.timeout( 5000 );

	it( 'runs code through typescript', function () {
		return rollup.rollup({
			entry: 'sample/basic/main.ts',
			plugins: [
				typescript()
			]
		}).then( function ( bundle ) {
			const code = bundle.generate().code;

			assert.ok( code.indexOf( 'number' ) === -1, code );
			assert.ok( code.indexOf( 'const' ) === -1, code );
		});
	});

	it( 'transpiles `export class A` correctly', function () {
		return rollup.rollup({
			entry: 'sample/export-class-fix/main.ts',
			plugins: [
				typescript()
			]
		}).then( function ( bundle ) {
			const code = bundle.generate().code;

			assert.equal( code.indexOf( 'class' ), -1, code );
			assert.ok( code.indexOf( 'var A = (function' ) !== -1, code );
			assert.ok( code.indexOf( 'var B = (function' ) !== -1, code );
			assert.ok( code.indexOf( 'export { A, B };' ) !== -1, code );
		});
	});

	it( 'transpiles ES6 features to ES5 with source maps', function () {
		return rollup.rollup({
			entry: 'sample/import-class/main.ts',
			plugins: [
				typescript()
			]
		}).then( function ( bundle ) {
			const code = bundle.generate().code;

			assert.equal( code.indexOf( 'class' ), -1, code );
			assert.equal( code.indexOf( '...' ), -1, code );
			assert.equal( code.indexOf( '=>' ), -1, code );
		});
	});

	it( 'reports diagnostics and throws if errors occur during transpilation', function () {
		return rollup.rollup({
			entry: 'sample/syntax-error/missing-type.ts',
			plugins: [
				typescript()
			]
		}).catch( function ( error ) {
			assert.ok( error.message.indexOf( 'There were TypeScript errors' ) === 0, 'Should reject erroneous code.' );
		});
	});

	it( 'should use named exports for classes', function () {
		return rollup.rollup({
			entry: 'sample/export-class/main.ts',
			plugins: [
				typescript()
			]
		}).then( function ( bundle ) {
			assert.equal( evaluate( bundle ).foo, 'bar' );
		});
	});

	it( 'supports overriding the TypeScript version', function () {
		return rollup.rollup({
			entry: 'sample/overriding-typescript/main.ts',
			plugins: [
				typescript({
					// test with a mocked version of TypeScript
					typescript: {
						transpileModule: function ( code ) {
							// Ignore the code to transpile. Always return the same thing.
							return {
								outputText: 'export default 1337;',
								diagnostics: [],
								sourceMapText: JSON.stringify({ mappings: '' })
							};
						}
					}
				})
			]
		}).then( function ( bundle ) {
			assert.equal( bundle.generate().code.indexOf( 'var main = 1337;' ), 0 );
		});
	});

	it( 'should transpile JSX if enabled', function () {
		return rollup.rollup({
			entry: 'sample/jsx/main.tsx',
			plugins: [
				typescript({
					jsx: 'react'
				})
			]
		}).then( function ( bundle ) {
			const code = bundle.generate().code;

			assert.ok( code.indexOf( 'React.createElement("span", null, "Yo!")' ) !== -1, code );
		});
	});
});
