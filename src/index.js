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
import createCompiler from './compiler';

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

	if ( compareVersions( typescript.version, '1.6.0' ) < 0 ) {
		throw new Error( `rollup-plugin-typescript: TypeScript version must be later than 1.6.0` );
	}

	delete options.typescript;

	// Load options from `tsconfig.json` unless explicitly asked not to.
	const tsconfig = options.tsconfig === false
		? {}
		: typeof options.tsconfig === 'string'
			? compilerOptionsFromTsConfig(typescript, options.tsconfig)
			: compilerOptionsFromTsConfig(typescript, 'tsconfig.json');

	delete options.tsconfig;

	const useLanguageService = options.useLanguageService !== false;
	delete options.useLanguageService;

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

	const isVersionOne = compareVersions( typescript.version, '2.0.0' ) >= 0;
	let isFirstRun = true;

	let compiler;

	return {
		options (opts) {
			const entryFile = path.resolve(process.cwd(), opts.entry);
			compiler = createCompiler( typescript, compilerOptions, entryFile, useLanguageService );

			const definitionsFilter = createFilter(
				[ '*.d.ts', '**/*.d.ts' ],
				[ 'node_modules/**' ] );

			function read (dir, parent) {
				dir.forEach(file => {
					file = path.join(parent, file);
					const stats = fs.statSync(file);
					if (stats.isFile() && file.indexOf('.d.ts') > -1) {
						if (definitionsFilter(file)) {
							compiler.compileFile(file, fs.readFileSync(file, 'utf8'), false);
						}
					} else if (stats.isDirectory()) {
						read(fs.readdirSync(file), file);
					}
				});
			}
			read(fs.readdirSync(process.cwd()), process.cwd());
		},

		resolveId ( importee, importer ) {
			// Handle the special `typescript-helpers` import itself.
			if ( isVersionOne && importee === helpersId ) {
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
			if ( isVersionOne && id === helpersId ) {
				return helpersSource;
			}
		},

		transform ( code, id ) {
			if ( !filter( id ) ) return null;

			if ( compilerOptions.target === undefined || compilerOptions.target < typescript.ScriptTarget.ES2015 && isVersionOne ) {
				code = fixExportClass( code, id );
			}

			const transformed = compiler.compileFile( id, code, !isFirstRun );

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

			if ( fatalError && isFirstRun ) {
				throw new Error( `There were TypeScript errors transpiling` );
			}

			let finalCode = transformed.outputText;

			if (isVersionOne) {
				// Always append an import for the helpers (for versions < 2)
				finalCode += `\nimport { __assign, __awaiter, __extends, __decorate, __metadata, __param } from '${helpersId}';`;
			}

			return {
				code: finalCode,

				// Rollup expects `map` to be an object so we must parse the string
				map: transformed.sourceMapText ? JSON.parse(transformed.sourceMapText) : null
			};
		},

		onwrite () {
			isFirstRun = false;
		}
	};
}
