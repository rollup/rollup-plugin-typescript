var typescript = require( 'typescript' );
var createFilter = require( 'rollup-pluginutils' ).createFilter;
var fs = require('fs');

var assign = Object.assign || function ( target, source ) {
	Object.keys( source ).forEach( function ( key ) {
		target[ key ] = source[ key ];
	});

	return target;
};

var	resolveHost = {
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

			//Use the typescript nodeModuleNameResolver for finding external Modules
			result = typescript.nodeModuleNameResolver(importee, importer, resolveHost);

			if(result.resolvedModule && result.resolvedModule.resolvedFileName ) {
				fileName = result.resolvedModule.resolvedFileName;

				//If it's a typing, we probably want to look for the real js file
				if(fileName.endsWith(".d.ts")) {

					//Super simple search for file
					candidateFile = fileName.replace(/\.d\.ts$/, ".js");

					//We check the file exists, and if it does, we assume the right one.
					if(resolveHost.fileExists(candidateFile)) {
						return candidateFile;
					}

				} else {
					return fileName;
				}

			}

			return null;
		}
	};
};
