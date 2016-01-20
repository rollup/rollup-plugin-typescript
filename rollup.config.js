import typescript from 'rollup-plugin-typescript';

export default {
	entry: 'src/index.ts',

	external: [
		'fs',
		'object-assign',
		'rollup-pluginutils',
		'tippex',
		'typescript'
	],

	plugins: [
		typescript()
	]
};
