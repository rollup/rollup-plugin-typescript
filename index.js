var typescript = require( 'typescript' );
var createFilter = require( 'rollup-pluginutils' ).createFilter;

var assign = Object.assign || function ( target, source ) {
	Object.keys( source ).forEach( function ( key ) {
		target[ key ] = source[ key ];
	});

	return target;
};

module.exports = function ( options ) {
	options = assign( {}, options || {} );

	var filter = createFilter( options.include, options.exclude );
	delete options.include;
	delete options.exclude;

	return {
		transform: function ( code, id ) {
			if ( !filter( id ) ) return null;

			var transformed = typescript.transpileModule( code, {
				compilerOptions: assign( { target: typescript.ScriptTarget.ES6 }, options )
			});


			return {
				code: transformed.outputText,
				map: transformed.sourceMapText
			};
		}
	};
};
