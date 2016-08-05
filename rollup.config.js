import buble from 'rollup-plugin-buble';

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
	]
};
