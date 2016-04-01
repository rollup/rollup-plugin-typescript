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

### JSX
JSX can be enabled by setting the `jsx` option to one of `'none'`, `'preserve'`and `'react'`.
```js
// rollup.config.js
import typescript from 'rollup-plugin-typescript';

export default {
  entry: './main.tsx',

  plugins: [
    typescript({
      jsx: 'react'
    })
  ]
}
```

### TypeScript version
rollup-plugin-typescript uses [TypeScript 1.8.9](https://github.com/Microsoft/TypeScript/wiki/Roadmap#18) per default. Should your project require it, you can override the TypeScript version used for _transpiling the sources_.

```js
typescript({
  typescript: require('some-fork-of-typescript')
})
```

## Issues
Emit-less types, see [#28](https://github.com/rollup/rollup-plugin-typescript/issues/28).

## License

MIT
