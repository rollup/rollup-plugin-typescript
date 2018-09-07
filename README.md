# rollup-plugin-typescript
[![Build Status](https://travis-ci.org/rollup/rollup-plugin-typescript.svg?branch=master)](https://travis-ci.org/rollup/rollup-plugin-typescript)
![npm-version](https://img.shields.io/npm/v/rollup-plugin-typescript.svg?maxAge=2592000)
![npm-monthly-downloads](https://img.shields.io/npm/dm/rollup-plugin-typescript.svg?maxAge=2592000)
![npm-dependencies](https://img.shields.io/david/rollup/rollup-plugin-typescript.svg?maxAge=2592000)

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
  input: './main.ts',

  plugins: [
    typescript()
  ]
}
```

The plugin loads any [`compilerOptions`](http://www.typescriptlang.org/docs/handbook/compiler-options.html) from the `tsconfig.json` file by default. Passing options to the plugin directly overrides those options.

The following options are unique to `rollup-plugin-typescript`:

* `options.include` and `options.exclude` (each a minimatch pattern, or array of minimatch patterns), which determine which files are transpiled by Typescript (all `.ts` and `.tsx` files by default).

* `tsconfig` when set to false, ignores any options specified in the config file

* `typescript` overrides TypeScript used for transpilation

### TypeScript version
[TypeScript 2.6.2](https://github.com/Microsoft/TypeScript/wiki/Roadmap#26-october-2017) is used by default. Should your project require it, you can override the TypeScript version used for _transpiling the sources_.

```js
typescript({
  typescript: require('some-fork-of-typescript')
})
```

## Issues
Emit-less types, see [#28](https://github.com/rollup/rollup-plugin-typescript/issues/28).
