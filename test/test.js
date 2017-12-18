const assert = require( 'assert' );
const rollup = require( 'rollup' );
const assign = require( 'object-assign' );
const typescript = require( '..' );

process.chdir( __dirname );

// Evaluate a bundle (as CommonJS) and return its exports.
async function evaluate ( bundle ) {
	const module = { exports: {} };

	new Function( 'module', 'exports', (await bundle.generate({ format: 'cjs' })).code )( module, module.exports );

	return module.exports;
}

// Short-hand for rollup using the typescript plugin.
function bundle ( main, options ) {
	return rollup.rollup({
		input: main,
		plugins: [ typescript( options ) ]
	});
}

function getNextWarning ( callback ) {
	const warn = console.warn;
	console.warn = (message) => {
		console.warn = warn;
		callback(message);
	};
}

describe( 'rollup-plugin-typescript', function () {
	this.timeout( 5000 );

	it( 'runs code through typescript', async () => {
		const b = await bundle( 'sample/basic/main.ts' );
		const { code } = await b.generate({ format: 'es' });

		assert.ok( code.indexOf( 'number' ) === -1, code );
		assert.ok( code.indexOf( 'const' ) === -1, code );
	});

	it( 'ignores the declaration option', () => {
		return bundle( 'sample/basic/main.ts', { declaration: true });
	});

	it( 'handles async functions', async () => {
		const b = await bundle( 'sample/async/main.ts', {
			target: 'es2015'
		});
		const wait = await evaluate(b);

		return wait(3);
	});

	it( 'does not duplicate helpers', async () => {
		const b = await bundle( 'sample/dedup-helpers/main.ts' );
		const { code } = await b.generate({ format: 'es' });

		// The `__extends` function is defined in the bundle.
		assert.ok( code.indexOf( 'function __extends' ) > -1, code );

		// No duplicate `__extends` helper is defined.
		assert.equal( code.indexOf( '__extends$1' ), -1, code );
	});

	it( 'transpiles `export class A` correctly', async () => {
		const b = await bundle( 'sample/export-class-fix/main.ts' );
		const { code } = await b.generate({ format: 'es' });

		assert.equal( code.indexOf( 'class A' ), -1, code );
		assert.notEqual( code.indexOf( 'var A = /** @class */ (function' ), -1, code );
		assert.notEqual( code.indexOf( 'var B = /** @class */ (function' ), -1, code );
		assert.notEqual( code.indexOf( 'export { A, B };' ), -1, code );
	});

	it( 'transpiles ES6 features to ES5 with source maps', async () => {
		const b = await bundle( 'sample/import-class/main.ts' );
		const { code } = await b.generate({ format: 'es' });

		assert.equal( code.indexOf( 'class A' ), -1, code );
		assert.equal( code.indexOf( '...' ), -1, code );
		assert.equal( code.indexOf( '=>' ), -1, code );
	});

	it( 'reports diagnostics and throws if errors occur during transpilation', async () => {
		let errored;
		try {
			await bundle( 'sample/syntax-error/missing-type.ts' );
		} catch (err) {
			errored = true;
			assert.ok( err.message.indexOf( 'There were TypeScript errors transpiling' ) !== -1, 'Should reject erroneous code.' );
		}

		assert.ok(errored);
	});

	it( 'works with named exports for abstract classes', async () => {
		const b = await bundle( 'sample/export-abstract-class/main.ts' );
		const { code } = await b.generate({ format: 'es' });
		assert.ok( code.length > 0, code );
	});

	it( 'should use named exports for classes', async () => {
		const b = await bundle( 'sample/export-class/main.ts' );
		assert.equal( (await evaluate( b )).foo, 'bar' );
	});

	it( 'supports overriding the TypeScript version', async () => {
		const b = await bundle('sample/overriding-typescript/main.ts', {
			// Don't use `tsconfig.json`
			tsconfig: false,

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
			await bundle( 'sample/overriding-typescript/main.ts', {
				tsconfig: false,
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

			getNextWarning((message) => {
				warning = message;
			});

			await rollup.rollup({
				input: 'sample/overriding-typescript/main.ts',
				plugins: [
					typescript({
						tsconfig: false,
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

	it( 'should not resolve .d.ts files', async () => {
		const b = await bundle( 'sample/dts/main.ts' );
		assert.deepEqual( b.imports, [ 'an-import' ] );
	});

	it( 'should transpile JSX if enabled', async () => {
		const b = await bundle( 'sample/jsx/main.tsx', { jsx: 'react' });
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
		return bundle( 'sample/overriding-typescript/main.ts', {
			inlineSourceMap: true
		});
	});

	it ( 'should not fail if source maps are off', () => {
		return bundle( 'sample/overriding-typescript/main.ts', {
			inlineSourceMap: false,
			sourceMap: false
		});
	});

	it( 'does not include helpers in source maps', async () => {
		const b = await bundle( 'sample/dedup-helpers/main.ts', {
			sourceMap: true
		});

		const { map } = await b.generate({
			format: 'es',
			sourcemap: true
		});

		assert.ok( map.sources.every( source => source.indexOf( 'typescript-helpers' ) === -1) );
	});

	describe( 'transformers', () => {
		it( 'is enabled for versions >= 2.3.0', async () => {
			await bundle( 'sample/overriding-typescript/main.ts', {
				tsconfig: false,
				getCustomTransformers: () => ({}),

				typescript: fakeTypescript({
					version: '2.3.0-fake',
					transpileModule ( code, options ) {
						assert.ok( options.transformers,
							'transformers should be passed in' );

						return {
							outputText: '',
							diagnostics: [],
							sourceMapText: JSON.stringify({ mappings: '' })
						};
					}
				})
			});
		});

		it( 'is disabled with a warning < 2.3.0', async () => {
			let warning = '';

			getNextWarning((message) => {
				warning = message;
			});

			await rollup.rollup({
				input: 'sample/overriding-typescript/main.ts',
				plugins: [
					typescript({
						tsconfig: false,
						getCustomTransformers: () => ({}),

						typescript: fakeTypescript({
							version: '2.2.0-fake'
						})
					})
				]
			});

			assert.notEqual( warning.indexOf( "'getCustomTransformers' is not supported" ), -1 );
		});

		it( 'applies one correctly', async () => {
			const transformers = require( './sample/transformers/transformers' );

			const b = await bundle( 'sample/transformers/main.ts', {
				getCustomTransformers: () => ({
					before: [
						transformers.guardedAccess()
					]
				})
			});
			const { code } = await b.generate({ format: 'es' });

			assert.equal(
				code.match(/function getName\(people, index\) {([\s\S]*?)}/)[1],
				code.match(/function getName_transformed\(people, index\) {([\s\S]*?)}/)[1],
				'output transformed function body should be identical to expected'
			);
		});

		it( 'applies multiple correctly', async () => {
			const transformers = require( './sample/transformers/transformers' );

			const b = await bundle( 'sample/transformers/main.ts', {
				getCustomTransformers: () => ({
					before: [
						transformers.guardedAccess(),
						transformers.void0()
					]
				})
			});
			const { code } = await b.generate({ format: 'es' });

			assert.equal(
				code.match(/function getName\(people, index\) {([\s\S]*?)}/)[1],
				code.match(/function getName_transformed\(people, index\) {([\s\S]*?)}/)[1],
				'output transformed getName function body should equal to expectation'
			);

			assert.equal(
				code.match(/function getNameUndefined\(people, index\) {([\s\S]*?)}/)[1],
				code.match(/function getNameUndefined_transformed\(people, index\) {([\s\S]*?)}/)[1],
				'output transformed getNameUndefined function body should equal to expectation'
			);
		});

		it( 'supports format compatible with webpack ts-loader', async () => {
			const transform = require('ts-transform-safely').transform;

			const b = await bundle( 'sample/transformers/ts-loader-compat.ts', {
				getCustomTransformers: () => ({
					before: [
						transform()
					]
				})
			});

			const { code } = await b.generate({ format: 'es' });
			assert.equal(
				code,
				`a == null ? void 0 : a.b;\n`
			);
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
		}
	}, custom);
}
