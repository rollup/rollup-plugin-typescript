var assert = require( 'assert' );
var rollup = require( 'rollup' );
var typescript = require( '..' );

process.chdir( __dirname );

describe( 'rollup-plugin-typescript', function () {
	this.timeout( 5000 );

	it( 'runs code through typescript', function () {
		return rollup.rollup({
			entry: 'sample/basic/main.ts',
			plugins: [
				typescript()
			]
		}).then( function ( bundle ) {
			const generated = bundle.generate();
			const code = generated.code;

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
			const generated = bundle.generate();
			const code = generated.code;

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
			const generated = bundle.generate();
			const code = generated.code;

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
		var start = Date.now();

		return rollup.rollup({
			entry: 'sample/export-class/main.ts',
			plugins: [
				typescript()
			]
		}).then( function ( bundle ) {
			console.log( 'bundled in %s ms', Date.now() - start );

			start = Date.now();
			const generated = bundle.generate();
			console.log( 'generated in %s ms', Date.now() - start );

			const code = generated.code;

			console.log(code);

			assert.ok( code.indexOf( 'Foo' ) !== -1, code );
		});
	});
});
