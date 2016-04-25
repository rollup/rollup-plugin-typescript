import * as ts from 'typescript';
import { createFilter } from 'rollup-pluginutils';
import * as path from 'path';
import {
	existsSync,
	readFileSync,
	statSync,
} from 'fs';
import assign from 'object-assign';
import compareVersions from 'compare-versions';

import { endsWith } from './string';
import fixExportClass from './fixExportClass';

interface Options {
	tsconfig?: boolean;
	include?: string | string[];
	exclude?: string | string[];
	typescript?: typeof ts;
	module?: string;
}

const resolveHost = {
	fileExists ( filePath: string ): boolean {
		try {
			return statSync( filePath ).isFile();
		} catch ( err ) {
			return false;
		}
	}
};

function goodErrors ( diagnostic: ts.Diagnostic ): boolean {
	// All errors except `Cannot compile modules into 'es6' when targeting 'ES5' or lower.`
	return diagnostic.code !== 1204;
}

function getDefaultOptions(): any {
	return {
		noEmitHelpers: true,
		module: 'es2015',
		sourceMap: true
	};
}

// Gratefully lifted from 'look-up', due to problems using it directly:
//   https://github.com/jonschlinkert/look-up/blob/master/index.js
//   MIT Licenced
function findFile( cwd: string, filename: string ): string {
	let fp = cwd ? ( cwd + '/' + filename ) : filename;

	if ( existsSync( fp ) ) {
		return fp;
	}

	const segs = cwd.split( path.sep );
	let len = segs.length;

	while ( len-- ) {
		cwd = segs.slice( 0, len ).join( '/' );
		fp = cwd + '/' + filename;
		if ( existsSync( fp ) ) {
			return fp;
		}
	}
	return null;
}

function compilerOptionsFromTsConfig( typescript: typeof ts ): ts.CompilerOptions {
	const cwd = process.cwd();

	const tsconfig = typescript.readConfigFile( findFile( cwd, 'tsconfig.json' ), path => readFileSync( path, 'utf8' ) );

	if ( !tsconfig.config || !tsconfig.config.compilerOptions ) return {};

	return tsconfig.config.compilerOptions;
}

// Set `sourceMap` to `inlineSourceMap` if it's a boolean,
// under the assumption that both are never specified simultaneously.
function fixSourceMapOption( options: any ) {
	if ( typeof options.inlineSourceMap === 'boolean' ) {
		options.sourceMap = options.inlineSourceMap;
		delete options.inlineSourceMap;
	}
}

export default function typescript ( options: Options ) {
	options = assign( {}, options || {} );

	const filter = createFilter(
		options.include || [ '*.ts+(|x)', '**/*.ts+(|x)' ],
		options.exclude || [ '*.d.ts', '**/*.d.ts' ] );

	delete options.include;
	delete options.exclude;

	// Allow users to override the TypeScript version used for transpilation.
	const typescript: typeof ts = options.typescript || ts;

	delete options.typescript;

	// Load options from `tsconfig.json` unless explicitly asked not to.
	const tsconfig = options.tsconfig === false ? {} :
		compilerOptionsFromTsConfig( typescript );

	delete options.tsconfig;

	// Since Rollup handles the source maps; we equate the
	// `sourceMap` and `inlineSourceMap` options.
	fixSourceMapOption( tsconfig );
	fixSourceMapOption( options );

	// Merge all options.
	options = assign( tsconfig, getDefaultOptions(), options );

	// Verify that we're targeting ES2015 modules.
	if ( options.module !== 'es2015' && options.module !== 'es6' ) {
		throw new Error( `rollup-plugin-typescript: The module kind should be 'es2015', found: '${ options.module }'` );
	}

	const parsed = typescript.convertCompilerOptionsFromJson( options, process.cwd() );

	if ( parsed.errors.length ) {
		parsed.errors.forEach( error => console.error( `rollup-plugin-typescript: ${ error.messageText }` ) );

		throw new Error( `rollup-plugin-typescript: Couldn't process compiler options` );
	}

	const compilerOptions = parsed.options;

	return {
		resolveId ( importee: string, importer: string ): string {
			// Handle the special `typescript-helpers` import itself.
			if ( importee === 'typescript-helpers' ) {
				return path.resolve( __dirname, '../src/typescript-helpers.js' );
			}

			if ( !importer ) return null;

			var result: ts.ResolvedModuleWithFailedLookupLocations;

			if ( compareVersions( typescript.version, '1.8.0' ) < 0 ) {
				// Suppress TypeScript warnings for function call.
				result = (typescript as any).nodeModuleNameResolver( importee, importer, resolveHost );
			} else {
				result = typescript.nodeModuleNameResolver( importee, importer, compilerOptions, resolveHost );
			}

			if ( result.resolvedModule && result.resolvedModule.resolvedFileName ) {
				if ( endsWith( result.resolvedModule.resolvedFileName, '.d.ts' ) ) {
					return null;
				}

				return result.resolvedModule.resolvedFileName;
			}

			return null;
		},

		transform ( code: string, id: string ): { code: string, map: any } {
			if ( !filter( id ) ) return null;

			const transformed = typescript.transpileModule( fixExportClass( code, id ), {
				fileName: id,
				reportDiagnostics: true,
				compilerOptions
			});

			const diagnostics = transformed.diagnostics.filter( goodErrors );
			let fatalError = false;

			diagnostics.forEach( diagnostic => {
				var message = typescript.flattenDiagnosticMessageText(diagnostic.messageText, '\n');

				if ( diagnostic.file ) {
					const { line, character } = diagnostic.file.getLineAndCharacterOfPosition( diagnostic.start );

					console.error( `${diagnostic.file.fileName}(${line + 1},${character + 1}): error TS${diagnostic.code}: ${message}` );
				} else {
					console.error( `Error: ${message}` );
				}

				if ( diagnostic.category === ts.DiagnosticCategory.Error ) {
					fatalError = true;
				}
			});

			if ( fatalError ) {
				throw new Error( `There were TypeScript errors transpiling "${id}"` );
			}

			return {
				// Always append an import for the helpers.
				code: transformed.outputText +
					`\nimport { __extends, __decorate, __metadata, __param, __awaiter } from 'typescript-helpers';`,

				// Rollup expects `map` to be an object so we must parse the string
				map: JSON.parse(transformed.sourceMapText)
			};
		}
	};
}
