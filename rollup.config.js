import buble from 'rollup-plugin-buble';
import pkg from './package.json';

export default {
	input: 'src/index.js',

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

	output: [
		{
			format: 'cjs',
			file: pkg.main
		},
		{
			format: 'es',
			file: pkg.module
		}
	]
};
