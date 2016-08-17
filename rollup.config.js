import buble from 'rollup-plugin-buble';

var pkg = require( './package.json' );

export default {
	entry: 'src/index.js',

	external: [
		'compare-versions',
		'path',
		'fs',
		'object-assign',
		'rollup-pluginutils',
		'tippex',
		'typescript'
	],

	plugins: [
		buble()
	],

	targets: [
		{
			format: 'cjs',
			dest: pkg.main
		},
		{
			format: 'es',
			dest: pkg.module
		}
	]
};
