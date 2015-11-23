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
				compilerOptions: assign( {
					target: typescript.ScriptTarget.ES5,
					module: typescript.ModuleKind.ES6,
					sourceMap: true
				}, options )
			});


			return {
				code: transformed.outputText,
				// Rollup expects `map` to be an object so we must parse the string
				map: JSON.parse(transformed.sourceMapText)
			};
		}
	};
};
