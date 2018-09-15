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
npm install --save-dev rollup-plugin-typescript typescript tslib
```

Note that both `typescript` and `tslib` are peer dependencies of this plugin that need to be installed separately.

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

* `typescript` overrides TypeScript used for transpilation:
  ```js
  typescript({
    typescript: require('some-fork-of-typescript')
  })
  ```

* `tslib` overrides the injected TypeScript helpers with a custom version
  ```js
  typescript({
    tslib: require('some-fork-of-tslib')
  })
  ```

### TypeScript version
Due to the use of `tslib` to inject helpers, this plugin requires at least [TypeScript 2.1](https://github.com/Microsoft/TypeScript/wiki/Roadmap#21-december-2016). See also [here](https://blog.mariusschulz.com/2016/12/16/typescript-2-1-external-helpers-library#the-importhelpers-flag-and-tslib).

## Issues
This plugin will currently **not warn for any type violations**. This plugin relies on TypeScript's [transpileModule](https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API#a-simple-transform-function) function which basically transpiles TypeScript to JavaScript by stripping any type information on a per-file basis. While this is faster than using the language service, no cross-file type checks are possible with this approach.

This also causes issues with emit-less types, see [#28](https://github.com/rollup/rollup-plugin-typescript/issues/28).
