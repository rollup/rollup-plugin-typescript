# rollup-plugin-typescript

Seamless integration between Rollup and Typescript.

## Why?
See [rollup-plugin-babel](https://github.com/rollup/rollup-plugin-babel).

## Installation

```bash
npm install --save-dev rollup-plugin-typescript
```

## Usage

```js
import { rollup } from 'rollup';
import typescript from 'rollup-plugin-typescript';

rollup({
  entry: 'main.ts',
  plugins: [
    typescript({
      sourceMap: true
    })
  ]
}).then(...)
```
All options are as per the [Typescript's Compiler Options](https://github.com/Microsoft/TypeScript/wiki/Compiler-Options), except `options.include` and `options.exclude` (each a minimatch pattern, or array of minimatch patterns), which determine which files are transpiled by Typescript (by default, all files are transpiled).

## Issues

TypeScript (as of 1.6.2) isn't able to transpile to ES5 while preserving ES2015 modules. This means that only TypeScript specific extensions are stripped from the code during transpilation. A second pass will be needed to target ES5.

This issue seems to be addressed by (the currently unreleased) [TypeScript 1.7.0](https://github.com/Microsoft/TypeScript/wiki/Roadmap#17) :tada:.

## License

MIT
