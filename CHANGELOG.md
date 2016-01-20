# rollup-plugin-typescript changelog

## master

### 0.4.0
* Work around TypeScript 1.7.5's transpilation issues ([#9](https://github.com/rollup/rollup-plugin-typescript/issues/9))
* Overridable TypeScript version when transpiling ([#4](https://github.com/rollup/rollup-plugin-typescript/issues/4))
* Add `jsx` support ([#11](https://github.com/rollup/rollup-plugin-typescript/issues/11))

## 0.3.0
* Author plugin in TypeScript
* Report diagnostics
* Resolve identifiers using `ts.nodeModuleNameResolver`

## 0.2.1
* Upgrade to TypeScript ^1.7.5
* Enable source maps per default

## 0.2.0
* Use (_prerelease version of_) TypeScript 1.7.0 to generate ES5 while preserving ES2015 imports for efficient bundling.

## 0.1.0
* Initial release
