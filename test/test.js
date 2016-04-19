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

// Short-hand for rollup using the typescript plugin.
function bundle( main, options ) {
	return rollup.rollup({
		entry: main,
		plugins: [ typescript( options ) ]
	});
}

describe( 'rollup-plugin-typescript', function () {
	this.timeout( 5000 );

	it( 'runs code through typescript', function () {
		return bundle( 'sample/basic/main.ts' ).then( function ( bundle ) {
			const code = bundle.generate().code;

			assert.ok( code.indexOf( 'number' ) === -1, code );
			assert.ok( code.indexOf( 'const' ) === -1, code );
		});
	});

	it( 'handles async functions', function () {
		return bundle( 'sample/async/main.ts' )
			.then( function ( bundle ) {
				const wait = evaluate( bundle );

				return wait( 3 );
			});
	});

	it( 'does not duplicate helpers', function () {
		return bundle( 'sample/dedup-helpers/main.ts' ).then( function ( bundle ) {
			const code = bundle.generate().code;

			// The `__extends` function is defined in the bundle.
			assert.ok( code.indexOf( 'function __extends' ) > -1, code );

			// No duplicate `__extends` helper is defined.
			assert.equal( code.indexOf( '__extends$1' ), -1, code );
		});
	});

	it( 'transpiles `export class A` correctly', function () {
		return bundle( 'sample/export-class-fix/main.ts' ).then( function ( bundle ) {
			const code = bundle.generate().code;

			assert.equal( code.indexOf( 'class' ), -1, code );
			assert.ok( code.indexOf( 'var A = (function' ) !== -1, code );
			assert.ok( code.indexOf( 'var B = (function' ) !== -1, code );
			assert.ok( code.indexOf( 'export { A, B };' ) !== -1, code );
		});
	});

	it( 'transpiles ES6 features to ES5 with source maps', function () {
		return bundle( 'sample/import-class/main.ts' ).then( function ( bundle ) {
			const code = bundle.generate().code;

			assert.equal( code.indexOf( 'class' ), -1, code );
			assert.equal( code.indexOf( '...' ), -1, code );
			assert.equal( code.indexOf( '=>' ), -1, code );
		});
	});

	it( 'reports diagnostics and throws if errors occur during transpilation', function () {
		return bundle( 'sample/syntax-error/missing-type.ts' ).catch( function ( error ) {
			assert.ok( error.message.indexOf( 'There were TypeScript errors' ) === 0, 'Should reject erroneous code.' );
		});
	});

	it( 'works with named exports for abstract classes', function () {
		return bundle( 'sample/export-abstract-class/main.ts' ).then(function ( bundle ) {
			const code = bundle.generate().code;
			assert.ok( code.length > 0, code );
		});
	});

	it( 'should use named exports for classes', function () {
		return bundle( 'sample/export-class/main.ts' ).then( function ( bundle ) {
			assert.equal( evaluate( bundle ).foo, 'bar' );
		});
	});

	it( 'supports overriding the TypeScript version', function () {
		return rollup.rollup({
			entry: 'sample/overriding-typescript/main.ts',
			plugins: [
				typescript({
					// Don't use `tsconfig.json`
					tsconfig: false,

					// test with a mocked version of TypeScript
					typescript: {
						transpileModule: function ( code ) {
							// Ignore the code to transpile. Always return the same thing.
							return {
								outputText: 'export default 1337;',
								diagnostics: [],
								sourceMapText: JSON.stringify({ mappings: '' })
							};
						},

						// return empty compiler options
						convertCompilerOptionsFromJson: function ( options ) {
							[
								'include',
								'exclude',
								'typescript',
								'tsconfig',
							].forEach( function ( option ) {
								if ( option in options ) {
									throw new Error( 'unrecognized compiler option "' + option + '"' );
								}
							});

							return { options: {}, errors: [] };
						}
					}
				})
			]
		}).then( function ( bundle ) {
			assert.equal( bundle.generate().code.indexOf( 'var main = 1337;' ), 0 );
		});
	});

	it( 'should not resolve .d.ts files', function () {
		return bundle( 'sample/dts/main.ts' ).then( function ( bundle ) {
			assert.deepEqual( bundle.imports, [ 'an-import' ] );
		});
	});

	it( 'should transpile JSX if enabled', function () {
		return bundle( 'sample/jsx/main.tsx', { jsx: 'react' }).then( function ( bundle ) {
			const code = bundle.generate().code;

			assert.ok( code.indexOf( 'React.createElement("span", null, "Yo!")' ) !== -1, code );
		});
	});

	it( 'should throw on bad options', function () {
		assert.throws( function () {
			bundle( 'does-not-matter.ts', {
				foo: 'bar'
			});
		}, /Couldn't process compiler options/ );
	});

	it( 'prevents errors due to conflicting `sourceMap`/`inlineSourceMap` options', function () {
		return bundle( 'sample/overriding-typescript/main.ts', {
			inlineSourceMap: true,
		});
	});
});
