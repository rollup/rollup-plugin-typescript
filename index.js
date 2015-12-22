var typescript = require( 'typescript' );
var createFilter = require( 'rollup-pluginutils' ).createFilter;
var fs = require('fs');

var assign = Object.assign || function ( target, source ) {
	Object.keys( source ).forEach( function ( key ) {
		target[ key ] = source[ key ];
	});

	return target;
};

var	moduleResolutionHost = {
		fileExists : function(filePath) {
		try {
				return fs.statSync(filePath).isFile();
		}
		catch (err) {
				return false;
		}
	}
}

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
					target: typescript.ScriptTarget.ES6,
					module: typescript.ModuleKind.ES6,
					sourceMap: true
				}, options )
			});


			return {
				code: transformed.outputText,
				// Rollup expects `map` to be an object so we must parse the string
				map: JSON.parse(transformed.sourceMapText)
			};
		},
		resolveId: function(importee, importer) {
			if(!importer) return null;
			result = typescript.nodeModuleNameResolver(importee, importer, moduleResolutionHost);

			if(result.resolvedModule && result.resolvedModule.resolvedFileName && result.resolvedModule.isExternalLibraryImport != true ) {
				return result.resolvedModule.resolvedFileName;
			} else {
				return null;
			}
		}
	};
};
