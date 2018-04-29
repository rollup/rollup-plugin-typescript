import * as ts from 'typescript';
import { createFilter } from 'rollup-pluginutils';

import { endsWith } from './string';
import { getDefaultOptions, compilerOptionsFromTsConfig, adjustCompilerOptions } from './options.js';
import fixExportClass from './fixExportClass';
import resolveHost from './resolveHost';

export default function typescript ( options = {} ) {
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
	options = Object.assign( tsconfig, getDefaultOptions(), options );

	const parsed = typescript.convertCompilerOptionsFromJson( options, process.cwd() );

	if ( parsed.errors.length ) {
		parsed.errors.forEach( error => console.error( `rollup-plugin-typescript: ${ error.messageText }` ) );

		throw new Error( `rollup-plugin-typescript: Couldn't process compiler options` );
	}

	const compilerOptions = parsed.options;

	return {
		resolveId ( importee, importer ) {
			if ( !importer ) return null;

			let result;

			importer = importer.split('\\').join('/');

			result = typescript.nodeModuleNameResolver( importee, importer, compilerOptions, resolveHost );

			if ( result.resolvedModule && result.resolvedModule.resolvedFileName ) {
				if ( endsWith( result.resolvedModule.resolvedFileName, '.d.ts' ) ) {
					return null;
				}

				return result.resolvedModule.resolvedFileName;
			}

			return null;
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
				code: transformed.outputText,

				// Rollup expects `map` to be an object so we must parse the string
				map: transformed.sourceMapText ? JSON.parse(transformed.sourceMapText) : null
			};
		}
	};
}
