var assert = require( 'assert' );
var rollup = require( 'rollup' );
var assign = require( 'object-assign' );
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

	it( 'ignores the declaration option', function () {
		return bundle( 'sample/basic/main.ts', { declaration: true });
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
			assert.ok( error.message.indexOf( 'There were TypeScript errors transpiling' ) !== -1, 'Should reject erroneous code.' );
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
		return bundle('sample/overriding-typescript/main.ts', {
			// Don't use `tsconfig.json`
			tsconfig: false,

			// test with a mocked version of TypeScript
			typescript: fakeTypescript({
				version: '1.8.0-fake',

				transpileModule: function ( code ) {
					// Ignore the code to transpile. Always return the same thing.
					return {
						outputText: 'export default 1337;',
						diagnostics: [],
						sourceMapText: JSON.stringify({ mappings: '' })
					};
				}
			})
		}).then( function ( bundle ) {
			assert.equal( evaluate( bundle ), 1337 );
		});
	});

	describe( 'strictNullChecks', function () {
		it( 'is enabled for versions >= 1.9.0', function () {
			return bundle( 'sample/overriding-typescript/main.ts', {
				tsconfig: false,
				strictNullChecks: true,

				typescript: fakeTypescript({
					version: '1.9.0-fake',
					transpileModule: function ( code, options ) {
						assert.ok( options.compilerOptions.strictNullChecks,
							'strictNullChecks should be passed through' );

						return {
							outputText: '',
							diagnostics: [],
							sourceMapText: JSON.stringify({ mappings: '' })
						};
					}
				}),
			});
		});

		it( 'is disabled with a warning < 1.9.0', function () {
			var warning = '';

			console.warn = function (msg) {
				warning = msg;
			};

			return rollup.rollup({
				entry: 'sample/overriding-typescript/main.ts',
				plugins: [
					typescript({
						tsconfig: false,
						strictNullChecks: true,

						typescript: fakeTypescript({
							version: '1.8.0-fake',
						})
					})
				]
			}).then( function () {
				assert.notEqual( warning.indexOf( "'strictNullChecks' is not supported" ), -1 );
			});
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

			assert.notEqual( code.indexOf( 'const __assign = ' ), -1,
				'should contain __assign definition' );

			const usage = code.indexOf( 'React.createElement("span", __assign({}, props), "Yo!")' );

			assert.notEqual( usage, -1, 'should contain usage' );
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

function fakeTypescript( custom ) {
	return assign({
		transpileModule: function ( code, options ) {
			return {
				outputText: '',
				diagnostics: [],
				sourceMapText: JSON.stringify({ mappings: '' })
			};
		},

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

			return {
				options: options,
				errors: []
			};
		}
	}, custom);
}
