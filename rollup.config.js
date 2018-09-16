import buble from 'rollup-plugin-buble';
import pkg from './package.json';

export default {
	input: 'src/index.js',

	external: [
		'path',
		'fs',
		'resolve',
		'rollup-pluginutils',
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
