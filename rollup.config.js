import buble from 'rollup-plugin-buble';
import pkg from './package.json';

export default {
	input: 'src/index.js',

	external: [
		'path',
		'fs',
		'rollup-pluginutils',
		'tippex',
		'typescript',
		'tslib'
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
