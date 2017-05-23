import * as fs from 'fs';
import compareVersions from 'compare-versions';

const fileCache = new Map();
const tsFiles = new Set();

let typescript = undefined;
let compilerOptions = undefined;
let entryFile = undefined;
let languageService = undefined;


function getFile (fileName) {
	let file = fileCache.get( fileName );

	if ( file === undefined ) {
		const version = Date.now().toString();

		if ( !fs.existsSync( fileName ) ) {
			file = {
				snapshot: undefined,
				version
			};
		} else {
			file = {
				snapshot: typescript.ScriptSnapshot.fromString( fs.readFileSync( fileName ).toString() ),
				version
			};
		}

		fileCache.set( fileName, file );
	}

	return file;
}

function setFileContent ( fileName, content, override ) {
	if (!override && fileCache.get( fileName )) {
		return;
	}

	tsFiles.add( fileName );

	fileCache.set( fileName, {
		snapshot: typescript.ScriptSnapshot.fromString( content ),
		version: Date.now().toString()
	});
}

function initLanguageService () {
	if (languageService) return;

	fixTypeLookup();

	const languageServiceHost = {
		getScriptFileNames: () => Array.from( tsFiles ),
		getScriptVersion: ( fileName ) => getFile( fileName ).version,
		getScriptSnapshot: (fileName) => getFile( fileName ).snapshot,
		getCurrentDirectory: () => process.cwd(),
		getCompilationSettings: () => compilerOptions,
		getDefaultLibFileName: ( options ) => typescript.getDefaultLibFilePath( options )
	};

	languageService = typescript.createLanguageService( languageServiceHost, typescript.createDocumentRegistry() );
}

/**
 * Workaround for the LanguageService not finding typings in node_modules/@types:
 * Manually set the "types" option to the folder names in node_modules/@types
 */
function fixTypeLookup () {
	if ( compilerOptions.types || compilerOptions.typeRoots ) return;

	if ( compareVersions( typescript.version, '2.0.0' ) < 0 ) {
		return;
	}

	if ( fs.existsSync( './node_modules/@types' ) ) {
		compilerOptions.types = fs.readdirSync('./node_modules/@types');
	}
}


function compileUsingLanguageService ( fileName, content, refreshFile ) {
	setFileContent( fileName, content, refreshFile );

	const result = {
		outputText: undefined,
		diagnostics: undefined,
		sourceMapText: undefined
	};

	const compiled = languageService.getEmitOutput( fileName );

	result.diagnostics = languageService.getCompilerOptionsDiagnostics()
		.concat( languageService.getSyntacticDiagnostics( fileName ) )
		.concat( languageService.getSemanticDiagnostics( fileName ) );

	compiled.outputFiles.forEach( outputFile => {
		if ( outputFile.name.slice( -3 ) === '.js' ) {
			result.outputText = outputFile.text;
		} else if ( outputFile.name.slice( -4 ) === '.map' ) {
			result.sourceMapText = outputFile.text;
		}
	});

	return result;
}

function compileUsingSimpleApi ( fileName, content ) {
	return typescript.transpileModule( content, {
		fileName,
		reportDiagnostics: true,
		compilerOptions
	});
}

function init ( ts, compilerOpts, entry, useLanguageService ) {
	typescript = ts;
	compilerOptions = compilerOpts;
	entryFile = entry;

	tsFiles.add( entryFile );

	if ( useLanguageService ) {
		initLanguageService();
	}
}

function compileFile ( fileName, content, refreshFile ) {
	return languageService
		? compileUsingLanguageService( fileName, content, refreshFile )
		: compileUsingSimpleApi( fileName, content );
}


export default {
	init,
	compileFile
};
