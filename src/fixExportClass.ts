import * as tippex from 'tippex';

// Hack around TypeScript's broken handling of `export class` with
// ES6 modules and ES5 script target.
//
// It works because TypeScript transforms
//
//     export class A {}
//
// into something like CommonJS, when we wanted ES6 modules.
//
//     var A = (function () {
//         function A() {
//         }
//         return A;
//     }());
//     exports.A = A;
//
// But
//
//     class A {}
//     export { A };
//
// is transformed into this beauty.
//
//     var A = (function () {
//         function A() {
//         }
//         return A;
//     }());
//     export { A };
//
// The solution is to replace the previous export syntax with the latter.
export default function fix ( code: string, id: string ): string {

	// Erase comments, strings etc. to avoid erroneous matches for the Regex.
	const cleanCode = getErasedCode( code, id );

	const re = /export\s+(default\s+)?((?:abstract\s+)?class)(?:\s+(\w+))?/g;
	let match: RegExpExecArray;

	while ( match = re.exec( cleanCode ) ) {
		// To keep source maps intact, replace non-whitespace characters with spaces.
		code = erase( code, match.index, match[ 0 ].indexOf( match[ 2 ] ) );

		let name = match[ 3 ];

		if ( match[ 1 ] ) { // it is a default export

			// TODO: support this too
			if ( !name ) throw new Error( `TypeScript Plugin: cannot export an un-named class (module ${ id })` );

			// Export the name ` as default`.
			name += ' as default';
		}

		// To keep source maps intact, append the injected exports last.
		code += `\nexport { ${ name } };`
	}

	return code;
}

function getErasedCode ( code: string, id: string ): string {
	try {
		return tippex.erase( code );
	} catch (e) {
		throw new Error( `rollup-plugin-typescript: ${ e.message }; when processing: '${ id }'` );
	}
}

function erase ( code: string, start: number, length: number ): string {
	const end = start + length;

	return code.slice( 0, start ) +
		code.slice( start, end ).replace( /[^\s]/g, ' ' ) +
		code.slice( end );
}
