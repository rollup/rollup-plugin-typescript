import typescript from 'rollup-plugin-typescript';

export default {
	entry: 'src/index.ts',

	external: [
		'fs',
		'object-assign',
		'rollup-pluginutils',
		'typescript'
	],

	plugins: [
		typescript()
	]
};
