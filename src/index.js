import * as ts from 'typescript';
import { createFilter } from 'rollup-pluginutils';
import * as path from 'path';
import * as fs from 'fs';
import assign from 'object-assign';
import compareVersions from 'compare-versions';

import { endsWith } from './string';
import { getDefaultOptions, compilerOptionsFromTsConfig, adjustCompilerOptions } from './options.js';
import fixExportClass from './fixExportClass';
import resolveHost from './resolveHost';

/*
interface Options {
	tsconfig?: boolean;
	include?: string | string[];
	exclude?: string | string[];
	typescript?: typeof ts;
	module?: string;
}
*/

// The injected id for helpers. Intentially invalid to prevent helpers being included in source maps.
const helpersId = '\0typescript-helpers';
const helpersSource = fs.readFileSync( path.resolve( __dirname, '../src/typescript-helpers.js' ), 'utf-8' );

export default function typescript ( options ) {
	options = assign( {}, options || {} );

	const filter = createFilter(
		options.include || [ '*.ts+(|x)', '**/*.ts+(|x)' ],
		options.exclude || [ '*.d.ts', '**/*.d.ts' ] );

	delete options.include;
	delete options.exclude;

	// Allow users to override the TypeScript version used for transpilation.
	const typescript = options.typescript || ts;

	delete options.typescript;

	// Load options from `tsconfig.json` unless explicitly asked not to.
	const tsconfig = options.tsconfig === false ? {} :
		compilerOptionsFromTsConfig( typescript );

	delete options.tsconfig;

	// Since the CompilerOptions aren't designed for the Rollup
	// use case, we'll adjust them for use with Rollup.
	adjustCompilerOptions( typescript, tsconfig );
	adjustCompilerOptions( typescript, options );

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
		resolveId ( importee, importer ) {
			// Handle the special `typescript-helpers` import itself.
			if ( importee === helpersId ) {
				return helpersId;
			}

			if ( !importer ) return null;

			let result;

			importer = importer.split('\\').join('/');

			if ( compareVersions( typescript.version, '1.8.0' ) < 0 ) {
				// Suppress TypeScript warnings for function call.
				result = typescript.nodeModuleNameResolver( importee, importer, resolveHost );
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

		load ( id ) {
			if ( id === helpersId ) {
				return helpersSource;
			}
		},

		transform ( code, id ) {
			if ( !filter( id ) ) return null;

			const transformed = typescript.transpileModule( fixExportClass( code, id ), {
				fileName: id,
				reportDiagnostics: true,
				compilerOptions
			});

			// All errors except `Cannot compile modules into 'es6' when targeting 'ES5' or lower.`
			const diagnostics = transformed.diagnostics ?
				transformed.diagnostics.filter( diagnostic => diagnostic.code !== 1204 ) : [];

			let fatalError = false;

			diagnostics.forEach( diagnostic => {
				const message = typescript.flattenDiagnosticMessageText(diagnostic.messageText, '\n');

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
				throw new Error( `There were TypeScript errors transpiling` );
			}

			return {
				// Always append an import for the helpers.
				code: transformed.outputText +
					`\nimport { __assign, __awaiter, __extends, __decorate, __metadata, __param } from '${helpersId}';`,

				// Rollup expects `map` to be an object so we must parse the string
				map: transformed.sourceMapText ? JSON.parse(transformed.sourceMapText) : null
			};
		}
	};
}
