var ts = require( 'typescript' );
var createFilter = require( 'rollup-pluginutils' ).createFilter;

var assign = Object.assign || function ( target, source ) {
	Object.keys( source ).forEach( function ( key ) {
		target[ key ] = source[ key ];
	});

	return target;
};

function goodErrors ( diagnostic ) {
	// All errors except `Cannot compile modules into 'es6' when targeting 'ES5' or lower.`
	return diagnostic.code !== 1204;
}

module.exports = function typescript ( options ) {
	options = assign( {}, options || {} );

	var filter = createFilter( options.include || [ '*.ts+(|x)', '**/*.ts+(|x)' ], options.exclude );
	delete options.include;
	delete options.exclude;

	options = assign( {
		target: ts.ScriptTarget.ES5,
		module: ts.ModuleKind.ES6,
		sourceMap: true
	}, options );

	return {
		transform: function ( code, id ) {
			if ( !filter( id ) ) return null;

			var transformed = ts.transpileModule( code, {
				reportDiagnostics: true,
				compilerOptions: options
			});

			var diagnostics = transformed.diagnostics.filter( goodErrors );
			var fatalError = false;

			diagnostics.forEach(function ( diagnostic ) {
				var message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');

				if ( diagnostic.file ) {
					var pos = diagnostic.file.getLineAndCharacterOfPosition( diagnostic.start );

					console.error( diagnostic.file.fileName +
						'(' + (pos.line + 1) + ',' + (pos.character + 1) + '): error ES' +
						diagnostic.code + ': ' + message );
				} else {
					console.error( 'Error: ' + message );
				}

				if ( diagnostic.category === ts.DiagnosticCategory.Error ) {
					fatalError = true;
				}
			});

			if ( fatalError ) {
				throw new Error( 'There were TypeScript errors transpiling "' + id + '"' );
			}

			return {
				code: transformed.outputText,
				// Rollup expects `map` to be an object so we must parse the string
				map: JSON.parse(transformed.sourceMapText)
			};
		}
	};
};
