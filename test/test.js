var assert = require( 'assert' );
var rollup = require( 'rollup' );
var plugin = require( '..' );

process.chdir( __dirname );

describe( 'rollup-plugin-typescript', function () {
	this.timeout( 5000 );

	it( 'runs code through typescript', function () {
		var start = Date.now();
		return rollup.rollup({
			entry: 'sample/basic/main.ts',
			plugins: [ plugin() ]
		}).then( function ( bundle ) {
			console.log( 'bundled in %s ms', Date.now() - start );

			start = Date.now();
			const generated = bundle.generate();
			console.log( 'generated in %s ms', Date.now() - start );

			const code = generated.code;

			assert.ok( code.indexOf( 'const' ) === -1, code );
		});
	});
});
