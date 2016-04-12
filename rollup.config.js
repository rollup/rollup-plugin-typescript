import typescript from 'rollup-plugin-typescript';
import { resolve } from 'path';

export default {
	entry: 'src/index.ts',

	external: [
		'compare-versions',
		'fs',
		'object-assign',
		'rollup-pluginutils',
		'tippex',
		'typescript'
	],

	plugins: [
		verbatim({
			names: [
				resolve( 'src/typescript-helpers.js' )
			]
		}),
		typescript()
	]
};

function verbatim( options ) {
	if ( !options || !options.names ) return {};

	return {
		transform: function ( code, id ) {
			if ( options.names.indexOf( id ) >= 0 ) {
				return {
					code: 'export default ' + JSON.stringify( code ) + ';',
					map: { mappings: '' }
				};
			}
		}
	}
}
