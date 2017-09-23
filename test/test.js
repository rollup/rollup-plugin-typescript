const path = require('path');
const assert = require( 'assert' );
const rollup = require( 'rollup' );
const assign = require( 'object-assign' );
const typescript = require( '..' );

// Evaluate a bundle (as CommonJS) and return its exports.
async function evaluate ( bundle ) {
	const module = { exports: {} };

	new Function( 'module', 'exports', 'require', (await bundle.generate({ format: 'cjs' }).code) )( module, module.exports, require ); // pass require for tslib

	return module.exports;
}

// Short-hand for rollup using the typescript plugin.
function bundle ( main, options ) {
	return rollup.rollup({
		input: main,
		plugins: [ typescript( options ) ]
	});
}

describe( 'rollup-plugin-typescript', function () {
	this.timeout( 5000 );

	it( 'runs code through typescript', async () => {
		const b = await bundle(path.join(__dirname, 'sample/basic/main.ts'));
		const { code } = await b.generate({ format: 'es' });

		assert.ok( code.indexOf( 'number' ) === -1, code );
		assert.ok( code.indexOf( 'const' ) === -1, code );
	});

	it( 'ignores the declaration option', () => {
		return bundle( path.join( __dirname, 'sample/basic/main.ts' ), { declaration: true });
	});

	//// test moved to tslib test
	// it( 'handles async functions', async () => {
	// 	const b = await bundle( 'sample/async/main.ts' );
	// 	const wait = await evaluate(b);

	// 	return wait(3);
	// });

	//// test removed as switching to tslib means that helpers are always deduped
	// it( 'does not duplicate helpers', async () => {
	// 	const b = await bundle( 'sample/dedup-helpers/main.ts' );
	// 	const { code } = await b.generate({ format: 'es' });

	// 	// The `__extends` function is defined in the bundle.
	// 	assert.ok( code.indexOf( 'function __extends' ) > -1, code );

	// 	// No duplicate `__extends` helper is defined.
	// 	assert.equal( code.indexOf( '__extends$1' ), -1, code );
	// });

	it( 'transpiles `export class A` correctly', async () => {
		const b = await bundle(path.join(__dirname, 'sample/export-class-fix/main.ts'));
		const { code } = await b.generate({ format: 'es' });

		assert.equal( code.indexOf( 'class' ), -1, code );
		assert.ok( code.indexOf( 'var A = (function' ) !== -1, code );
		assert.ok( code.indexOf( 'var B = (function' ) !== -1, code );
		assert.ok( code.indexOf( 'export { A, B };' ) !== -1, code );
	});

	it( 'does not fix export class when targeting ES6', async () => {
		const b = await bundle(path.join(__dirname, 'sample/export-class-no-fix/main.ts'), {
			target: 'ES6'
		});

		const { code } = b.generate({ format: 'es' });
		assert.ok( code.indexOf( 'export default main' ) !== -1, code );
	});

	it( 'transpiles ES6 features to ES5 with source maps', async () => {
		const b = await bundle(path.join(__dirname, 'sample/import-class/main.ts'));
		const { code } = await b.generate({ format: 'es' });

		assert.equal( code.indexOf( 'class' ), -1, code );
		assert.equal( code.indexOf( '...' ), -1, code );
		assert.equal( code.indexOf( '=>' ), -1, code );
	});

	it( 'reports diagnostics and throws if errors occur during transpilation', async () => {
		let errored;
		try {
			await bundle(path.join(__dirname, 'sample/syntax-error/missing-type.ts'));
		} catch (err) {
			errored = true;
			assert.ok( err.message.indexOf( 'There were TypeScript errors transpiling' ) !== -1, 'Should reject erroneous code.' );
		}

		assert.ok(errored);
	});

	it( 'works with named exports for abstract classes', async () => {
		const b = await bundle(path.join(__dirname, 'sample/export-abstract-class/main.ts'));
		const { code } = await b.generate({ format: 'es' });
		assert.ok( code.length > 0, code );
	});

	it( 'should use named exports for classes', async () => {
		const b = await bundle(path.join(__dirname, 'sample/export-class/main.ts'));
		assert.equal( (await evaluate( b )).foo, 'bar' );
	});

	it( 'supports overriding the TypeScript version', async () => {
		const b = await bundle(path.join(__dirname, 'sample/overriding-typescript/main.ts'), {
			// Don't use `tsconfig.json`
			tsconfig: false,
			useLanguageService: false,

			// test with a mocked version of TypeScript
			typescript: fakeTypescript({
				version: '1.8.0-fake',

				transpileModule: () => {
					// Ignore the code to transpile. Always return the same thing.
					return {
						outputText: 'export default 1337;',
						diagnostics: [],
						sourceMapText: JSON.stringify({ mappings: '' })
					};
				}
			})
		});

		assert.equal( await evaluate( b ), 1337 );
	});

	describe( 'strictNullChecks', () => {
		it( 'is enabled for versions >= 1.9.0', async () => {
			await bundle(path.join(__dirname, 'sample/overriding-typescript/main.ts'), {
				tsconfig: false,
				useLanguageService: false,
				strictNullChecks: true,

				typescript: fakeTypescript({
					version: '1.9.0-fake',
					transpileModule ( code, options ) {
						assert.ok( options.compilerOptions.strictNullChecks,
							'strictNullChecks should be passed through' );

						return {
							outputText: '',
							diagnostics: [],
							sourceMapText: JSON.stringify({ mappings: '' })
						};
					}
				})
			});
		});

		it( 'is disabled with a warning < 1.9.0', async () => {
			let warning = '';

			console.warn = function (msg) {
				warning = msg;
			};

			await rollup.rollup({
				input: path.join(__dirname, 'sample/overriding-typescript/main.ts'),
				plugins: [
					typescript({
						tsconfig: false,
						useLanguageService: false,
						strictNullChecks: true,

						typescript: fakeTypescript({
							version: '1.8.0-fake'
						})
					})
				]
			});

			assert.notEqual( warning.indexOf( "'strictNullChecks' is not supported" ), -1 );
		});
	});

	//// todo find a better way to test this
	// it( 'should not resolve .d.ts files', async () => {
	// 	const b = await bundle( 'sample/dts/main.ts' );
	// 	assert.deepEqual( b.imports, [ 'an-import' ] );
	// });

	it( 'should transpile JSX if enabled', async () => {
		const b = await bundle(path.join(__dirname, 'sample/jsx/main.tsx'), { jsx: 'react' });
		const { code } = await b.generate({ format: 'es' });

		assert.notEqual( code.indexOf( 'const __assign = ' ), -1,
			'should contain __assign definition' );

		const usage = code.indexOf( 'React.createElement("span", __assign({}, props), "Yo!")' );

		assert.notEqual( usage, -1, 'should contain usage' );
	});

	it( 'should throw on bad options', () => {
		assert.throws( () => {
			bundle( 'does-not-matter.ts', {
				foo: 'bar'
			});
		}, /Couldn't process compiler options/ );
	});

	it( 'prevents errors due to conflicting `sourceMap`/`inlineSourceMap` options', () => {
		return bundle( path.join( __dirname, 'sample/overriding-typescript/main.ts' ), {
			inlineSourceMap: true
		});
	});

	it ( 'should not fail if source maps are off', () => {
		return bundle( path.join( __dirname, 'sample/overriding-typescript/main.ts' ), {
			inlineSourceMap: false,
			sourceMap: false
		});
	});

	//// test removed as typescript handles this
	// it( 'does not include helpers in source maps', () => {
	// 	return bundle( 'sample/dedup-helpers/main.ts', {
	// 		sourceMap: true
	// 	}).then( bundle => {
	// 		const { map } = bundle.generate({
	// 			sourceMap: true
	// 		});
	//
	// 		assert.ok( map.sources.every( source => source.indexOf( 'typescript-helpers' ) === -1) );
	// 	});
	// });

	it( 'supports tslib helpers', () => {
		return bundle( path.join( __dirname, 'sample/tslib-helpers/main.ts' ), {
			target: 'ES5',
			lib: [ 'ES5', 'ES2015.iterable', 'es2015.promise', 'dom' ]
		}).then( bundle => {
			const code = bundle.generate().code;

			assert.notEqual( code.indexOf( 'return __generator' ), -1, 'should import tslib' );
		});
	});

	it( 'reads in custom tsconfig files', () => {
		return bundle(path.join( __dirname, 'sample/custom-tsconfig/main.ts' ), {
			tsconfig: path.join( __dirname, 'sample/custom-tsconfig/tsconfig.json' )
		}).then(bundle => {
			assert.equal(bundle.modules[1].code.indexOf('const val = 42'), 0);
		});
	});

	it( 'automatically includes .d.ts files', () => {
		return bundle( path.join( __dirname, 'sample/includes-definitions/main.ts' ) ).then(bundle => {
			assert.ok(bundle.generate().code.length > 0, 'code is generated');
		});
	});
});

function fakeTypescript ( custom ) {
	return assign({
		transpileModule () {
			return {
				outputText: '',
				diagnostics: [],
				sourceMapText: JSON.stringify({ mappings: '' })
			};
		},

		convertCompilerOptionsFromJson ( options ) {
			[
				'include',
				'exclude',
				'typescript',
				'tsconfig'
			].forEach( option => {
				if ( option in options ) {
					throw new Error( 'unrecognized compiler option "' + option + '"' );
				}
			});

			return {
				options,
				errors: []
			};
		},

		ScriptTarget: {
			ES3: 0,
			ES5: 1,
			ES6: 2,
			ES2015: 2,
			Latest: 2
		}
	}, custom);
}
