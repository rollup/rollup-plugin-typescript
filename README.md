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

TypeScript doesn't seem to be able to transpile to ECMAScript 5 while preserving modules. This means that only TypeScript specific syntax is stripped from the code during transpilation. (If a way exists, please let me know.)

## License

MIT
