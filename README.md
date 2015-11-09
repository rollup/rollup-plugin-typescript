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
All options are as per the [Typescript documentation](https://typescriptlang.org/), except `options.include` and `options.exclude` (each a minimatch pattern, or array of minimatch patterns), which determine which files are transpiled by Typescript (by default, all files are transpiled).

## License

MIT
