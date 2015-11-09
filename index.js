var typescript = require( 'typescript' );
var createFilter = require( 'rollup-pluginutils' ).createFilter;

module.exports = function ( options ) {
	options = assign( {}, options || {} );

	var filter = createFilter( options.include, options.exclude );
	delete options.include;
	delete options.exclude;

	return {
		transform: function ( code, id ) {
			if ( !filter( id ) ) return null;

			var transformed = typescript.transpileModule( code, { compilerOptions: Object.assign( { module: typescript.ModuleKind.ES6 }, options ) } );


			return {
				code: transformed.outputText,
				map: transformed.sourceMapText
			};
		}
	};
};
