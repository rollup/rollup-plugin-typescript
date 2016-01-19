# rollup-plugin-typescript
![travis-ci](https://travis-ci.org/rollup/rollup-plugin-typescript.svg?branch=master)

Seamless integration between Rollup and Typescript.

## Why?
See [rollup-plugin-babel](https://github.com/rollup/rollup-plugin-babel).

## Installation

```bash
npm install --save-dev rollup-plugin-typescript
```

## Usage

```js
// rollup.config.js
import typescript from 'rollup-plugin-typescript';

export default {
  entry: './main.ts',

  plugins: [
    typescript()
  ]
}
```

All options are as per the [Typescript's Compiler Options](https://github.com/Microsoft/TypeScript/wiki/Compiler-Options), except `options.include` and `options.exclude` (each a minimatch pattern, or array of minimatch patterns), which determine which files are transpiled by Typescript (all `.ts` and `.tsx` files by default).

## Issues

TypeScript 1.6.2 isn't able to transpile to ES5 while preserving ES2015 modules. That's why this plugin requires [TypeScript 1.7.0](https://github.com/Microsoft/TypeScript/wiki/Roadmap#17) or greater. The ScriptTarget can always be changed should your project require it! :rocket:

```js
// rollup.config.js
import typescript from 'rollup-plugin-typescript';
import * as ts from 'typescript';

export default {
  entry: './main.ts',

  plugins: [
    typescript({
      target: ts.ScriptTarget.ES6
    })
  ]
}
```

## License

MIT
