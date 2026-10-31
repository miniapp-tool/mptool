---
title: "@mptool/run"
icon: play
---

A custom JavaScript interpreter for mini-programs. It executes dynamically delivered code inside WeChat mini-programs, replacing the disabled `eval` and `new Function`. Size is about 108.7 kB.

The framework implements a complete interpreter pipeline of lexing → parsing → AST → evaluation. It runs **all of ES5 plus commonly used ES6 syntax** in constrained environments, while all built-in objects reuse the host runtime.

::: danger Not a security sandbox

`@mptool/run` objects and built-ins directly reuse the host runtime. User code can reach the host global object and bypass restrictions through `[].constructor.constructor("return this")()`. It is intended for **trusted / semi-trusted** dynamic code (such as configuration and logic delivered by operations), and its safety relies on a global allowlist plus step/stack limits. It **must not** be used to isolate malicious code.

:::

## Quick start

```ts
import { run, runSync, createSandbox, createFunction } from "@mptool/run";

// One-off execution
run("1 + 2 * 3"); // 7
run("const f = async () => await Promise.resolve(5); f()"); // Promise<5>

// Synchronous execution (throws if the code contains async)
runSync("let s = 0; for (let i = 0; i < 3; i += 1) s += i; s"); // 3

// Reuse a sandbox while preserving global state
const sandbox = createSandbox({ globals: { wx, console } });
sandbox.setGlobal("answer", 42);
sandbox.run("answer + 1"); // 43

// Replacement for new Function
const fn = createFunction(["a", "b"], "return a + b;");
fn(1, 2); // 3
```

## API

### `run(code, options?): unknown`

- `code`: the source code to execute
- `options`: interpreter options; see below

Executes a code snippet and returns the **completion value** (the value of the last expression). Returns a `Promise` when the code contains `async`/`await`.

### `runSync(code, options?): unknown`

Executes synchronously and throws an `Error` when the code triggers async. If the code itself is fully synchronous and only its return value is a Promise (such as `Promise.resolve(1)` or `new Promise(() => {})`), that Promise is returned as an ordinary return value.

### `createSandbox(options?): Sandbox`

Creates a sandbox with a shared global environment, suitable for repeated executions that need to preserve global state.

- `sandbox.run(code): unknown`: executes code (returns a `Promise` when it contains async)
- `sandbox.setGlobal(name, value)`: sets a global variable
- `sandbox.getGlobal(name): unknown`: reads a global variable

### `createFunction(args, body, options?): (...args: unknown[]) => unknown`

A replacement for `new Function`; each function has its own sandbox. The returned function **preserves the caller's `this`**, so `.call(page)` executes the function body with the page instance as `this`.

- `args`: an array of parameter names, such as `["a", "b"]`
- `body`: the function body source

#### Hot-update example

```ts
// In a page
import { a } from "../../utils";

Page({
  data: { count: 0 },

  onLoad() {
    // Attach module-level variables to the page instance; this only needs to be done once
    this.utils = { a };
  },

  // The server delivers a new function body to hot-update a page method
  applyHotUpdate(body: string) {
    const fn = createFunction([], body);

    // Execute with the page instance as `this`; the body can use this.data / this.setData / this.utils directly
    fn.call(this);
  },
});
```

Example function bodies: `return this.data.list.length;`, `this.setData({ count: this.utils.a + 1 });`

::: tip How hot-update functions access page data

- **Page state and methods** (`this.data`, `this.setData`, custom methods): pass the page instance as `this` via `.call(page)`; no need to declare them one by one
- **Module-level variables** (declared by `import`/`const`): like `new Function`, the interpreter cannot automatically read the caller's lexical variables (a JS language limitation). Attach them to `this` when initializing the page (such as `this.utils = { a }`); afterwards all hot-update code can access them through `this.utils.a`

:::

### `installGlobal()`

Mounts `createFunction` on the host global object (`globalThis.createFunction`) for page hot reload in `@mptool/enhance`.

In mini-programs, `app.js` always runs first, so call it in `app.js` (before any page registers):

```ts
// app.js
import { installGlobal } from "@mptool/run";

installGlobal();
```

### Options `RunOptions`

| Option            | Default     | Description                                                               |
| ----------------- | ----------- | ------------------------------------------------------------------------- |
| `globals`         | `{}`        | Inject host capabilities (`wx`, `console`, etc.; not exposed by default)  |
| `global`          | `false`     | Automatically expose all own properties of the host global (`globalThis`) |
| `maxSteps`        | `1e6`       | Step limit, preventing infinite loops                                     |
| `maxStack`        | `512`       | Call stack depth limit, preventing deep recursion                         |
| `maxDuration`     | unlimited   | Wall-clock budget per run (milliseconds); throws `Error` on timeout       |
| `strict`          | `false`     | Whether to execute in strict mode                                         |
| `features`        | all enabled | Feature toggles: `class`, `forOf`, `async`, `bigint`                      |
| `maxSourceLength` | unlimited   | Source length limit (UTF-16 code units); throws `ParseError`              |
| `maxParseDepth`   | unlimited   | Maximum expression/statement nesting depth; throws `ParseError`           |
| `maxBacktracks`   | `5000`      | Maximum tokens consumed during parser backtracking; throws `ParseError`   |

> Parsing budgets are opt-in on the host side (`maxSourceLength` / `maxParseDepth` are unlimited by default); parsing completes before execution, and neither `maxSteps` nor `maxDuration` covers parsing overhead. For scenarios that execute remote code, such as hot reload, set these limits explicitly.
>
> `maxDuration` is also opt-in (unlimited by default): it only checks the deadline at interpreter steps and host-call boundaries and **cannot interrupt the internals of a single host call** (for example, a very slow synchronous `wx` call), nor can it interrupt a host Promise that never settles.

::: tip How to access external variables in code

- Pass them explicitly through `globals`: `run("a + 1", { globals: { a } })`
- Or enable `global: true` to expose all own properties of the host global object `globalThis` automatically (including variables manually attached to the global; for example, after `globalThis.a = a`, code can access `a` directly)

Note: module variables introduced by `import` belong to the **lexical scope** of the caller's module. Like `new Function`, the interpreter cannot automatically read the caller's lexical variables (a JS language limitation). To access them in code, attach them to the global object or pass them through `globals`.

:::

## Supported syntax

### Statements

`var` / `let` / `const`, `if/else`, `switch`, `for`, `for...in`, `for...of`, `while`, `do...while`, `try/catch/finally`, `throw`, `return`, `break`, `continue`, labeled statements, function declarations/expressions, blocks, empty statements, `debugger`.

### Expressions and operators

- Literals: numbers (`0b`/`0o`/`0x`, scientific notation), strings, regexes, arrays, objects, `BigInt` (`123n`)
- Member access `.`/`[]`, optional chaining `?.`, nullish coalescing `??`, exponentiation `**`
- Calls, `new`, `delete`, `typeof`, `void`, `instanceof`, `in`
- Unary/binary/ternary/comma operators
- Assignment: `=`, compound assignment (`+=` etc.), logical assignment (`&&=`/`||=`/`??=`), increment/decrement (`++`/`--`)
- `this`, `arguments`, `super`

### ES6+ syntax

| Feature                        | Description                                                                       |
| ------------------------------ | --------------------------------------------------------------------------------- |
| Arrow functions                | Lexical `this`; supports expression and block bodies                              |
| Template literals              | Supports nested interpolation `` `a${b}c` ``                                      |
| Destructuring assignment       | Array/object/nested/default/rest; works for declarations and assignment targets   |
| Default parameters / rest args | `function(a, b = 1, ...rest)`                                                     |
| Spread                         | Array/object literals, function calls (including `new`)                           |
| Enhanced object literals       | Shorthand properties, computed keys `[k]`, method shorthand `m() {}`, `__proto__` |
| `for...of`                     | Delegates to the host iteration protocol; supports strings/arrays/Map/Set         |
| `class`                        | `extends`, `super`, static members, getters/setters                               |
| `async` / `await`              | See the "async/await" section                                                     |

## Built-in objects and prototype methods

All built-in objects **directly reuse the host runtime**; this library does not reimplement any methods — every prototype and static method supported by the host (WeChat base library 3.8.2) is available. The following globals are exposed by default:

**Values**: `undefined`, `NaN`, `Infinity`, `globalThis`

**Global functions**: `parseInt`, `parseFloat`, `isNaN`, `isFinite`, `encodeURI`, `decodeURI`, `encodeURIComponent`, `decodeURIComponent`, `escape`, `unescape`

**Constructors**: `Object`, `Array`, `String`, `Number`, `Boolean`, `Date`, `RegExp`, `Error` (and `TypeError`/`ReferenceError`/`SyntaxError`/`RangeError`/`EvalError`/`URIError`), `Symbol`, `BigInt`, `Map`, `Set`, `WeakMap`, `WeakSet`, `Promise`, `ArrayBuffer`, `DataView`, all `TypedArray`s

**Other objects**: `JSON`, `Math`, `Reflect`

The methods available on each constructor are as follows (all are available; the exact set depends on what the host base library 3.8.2 supports):

### `Array`

Static methods: `isArray`, `from`, `of`

Prototype methods: `concat`, `copyWithin`, `entries`, `every`, `fill`, `filter`, `find`, `findIndex`, `findLast`, `findLastIndex`, `flat`, `flatMap`, `forEach`, `includes`, `indexOf`, `join`, `keys`, `lastIndexOf`, `map`, `pop`, `push`, `reduce`, `reduceRight`, `reverse`, `shift`, `slice`, `some`, `sort`, `splice`, `toReversed`, `toSorted`, `toSpliced`, `unshift`, `values`, `with`, `at`

### `String`

Static methods: `fromCharCode`, `fromCodePoint`, `raw`

Prototype methods: `at`, `charAt`, `charCodeAt`, `codePointAt`, `concat`, `endsWith`, `includes`, `indexOf`, `lastIndexOf`, `localeCompare`, `match`, `matchAll`, `normalize`, `padEnd`, `padStart`, `repeat`, `replace`, `replaceAll`, `search`, `slice`, `split`, `startsWith`, `substr`, `substring`, `toLocaleLowerCase`, `toLocaleUpperCase`, `toLowerCase`, `toUpperCase`, `trim`, `trimEnd`, `trimStart`, `valueOf`

### `Object`

Static methods: `assign`, `create`, `defineProperties`, `defineProperty`, `entries`, `freeze`, `fromEntries`, `getOwnPropertyDescriptor`, `getOwnPropertyDescriptors`, `getOwnPropertyNames`, `getOwnPropertySymbols`, `getPrototypeOf`, `hasOwn`, `is`, `isExtensible`, `isFrozen`, `isSealed`, `keys`, `preventExtensions`, `seal`, `setPrototypeOf`, `values`

Prototype methods: `hasOwnProperty`, `isPrototypeOf`, `propertyIsEnumerable`, `toString`, `valueOf`

### `Number` / `Math` / `Boolean`

- `Number` static methods: `isFinite`, `isInteger`, `isNaN`, `isSafeInteger`, `parseFloat`, `parseInt`; prototype methods: `toExponential`, `toFixed`, `toPrecision`, `toString`
- `Math`: `abs`, `acos`, `acosh`, `asin`, `asinh`, `atan`, `atan2`, `atanh`, `cbrt`, `ceil`, `clz32`, `cos`, `cosh`, `exp`, `expm1`, `floor`, `fround`, `hypot`, `imul`, `log`, `log10`, `log1p`, `log2`, `max`, `min`, `pow`, `random`, `round`, `sign`, `sin`, `sinh`, `sqrt`, `tan`, `tanh`, `trunc`
- `Boolean` prototype methods: `toString`, `valueOf`

### `Date` / `RegExp` / `JSON`

- `Date` static methods: `now`, `parse`, `UTC`; prototype methods: `getDate`, `getDay`, `getFullYear`, `getHours`, `getMilliseconds`, `getMinutes`, `getMonth`, `getSeconds`, `getTime`, `getTimezoneOffset`, `getUTCDate`, `getUTCDay`, `getUTCFullYear`, `getUTCHours`, `getUTCMilliseconds`, `getUTCMinutes`, `getUTCMonth`, `getUTCSeconds`, `setDate`, `setFullYear`, `setHours`, `setMilliseconds`, `setMinutes`, `setMonth`, `setSeconds`, `setTime`, `setUTCDate`, `setUTCFullYear`, `setUTCHours`, `setUTCMilliseconds`, `setUTCMinutes`, `setUTCMonth`, `setUTCSeconds`, `toDateString`, `toISOString`, `toJSON`, `toLocaleDateString`, `toLocaleString`, `toLocaleTimeString`, `toString`, `toTimeString`, `toUTCString`, `valueOf`
- `RegExp` prototype methods: `exec`, `test`, `toString`
- `JSON`: `parse`, `stringify`

### `Map` / `Set` / `WeakMap` / `WeakSet`

- `Map` prototype methods: `clear`, `delete`, `entries`, `forEach`, `get`, `has`, `keys`, `set`, `values`
- `Set` prototype methods: `add`, `clear`, `delete`, `difference`, `entries`, `forEach`, `has`, `intersection`, `isDisjointFrom`, `isSubsetOf`, `isSupersetOf`, `keys`, `symmetricDifference`, `union`, `values`
- `WeakMap` prototype methods: `delete`, `get`, `has`, `set`
- `WeakSet` prototype methods: `add`, `delete`, `has`

### `Promise` / `Symbol` / `BigInt` / `Reflect`

- `Promise` static methods: `all`, `allSettled`, `any`, `race`, `reject`, `resolve`; prototype methods: `catch`, `finally`, `then`
- `Symbol` static methods: `for`, `keyFor`; prototype methods: `toString`, `valueOf`
- `BigInt` static methods: `asIntN`, `asUintN`; prototype methods: `toString`, `valueOf`
- `Reflect`: `apply`, `construct`, `defineProperty`, `deleteProperty`, `get`, `getOwnPropertyDescriptor`, `getPrototypeOf`, `has`, `isExtensible`, `ownKeys`, `preventExtensions`, `set`, `setPrototypeOf`

### `ArrayBuffer` / `DataView` / `TypedArray`

- `ArrayBuffer` static methods: `isView`; prototype methods: `slice`
- `DataView` prototype methods: `getBigInt64`, `getBigUint64`, `getFloat32`, `getFloat64`, `getInt16`, `getInt32`, `getInt8`, `getUint16`, `getUint32`, `getUint8`, `setBigInt64`, `setBigUint64`, `setFloat32`, `setFloat64`, `setInt16`, `setInt32`, `setInt8`, `setUint16`, `setUint32`, `setUint8`
- `TypedArray` (all types such as `Int8Array`): supports index access, and all prototype methods are available (delegated to the host)

Interpreter functions are host-callable wrappers: in `[1,2,3].map(x => x * 2)`, the host `map` can call interpreter arrow functions directly, and `call`/`apply`/`bind` and `instanceof` all follow host semantics.

## Special semantics

- **Function declaration hoisting**: function declarations are hoisted together with their values, so they can be called before they are declared
  ```js
  f(); // 42
  function f() {
    return 42;
  }
  ```
- **`var` hoisting**: hoisted to the top of the function scope with an initial value of `undefined`
- **`let`/`const` TDZ**: accessing before declaration throws `ReferenceError`; reassigning a `const` throws `TypeError`
- **Per-iteration `let`**: `for (let i...)` creates a separate binding per iteration, and closures capture their own value
- **Strict mode**: `RunOptions.strict` covers duplicate parameters (non-simple parameter lists are always rejected), legacy octal literals/escapes, assignment to `eval`/`arguments` and other early errors and runtime semantics; however, `"use strict"` directives inside functions and the forced strictness of class bodies are still not implemented.

**Block scoping**: `let`/`const`/`class` are predeclared in the temporal dead zone when entering a block (including `switch` bodies and function bodies); `switch` `case`s share the same block scope; block-level function declarations in sloppy mode additionally get a function-scoped `var` binding per Annex B (`undefined` before the block executes), and are visible only inside the block under `RunOptions.strict`

- **Sloppy mode** (default): in standalone function calls, `this` is boxed to the global when `undefined`; assigning to an undeclared variable creates a global; `arguments` is mapped to named parameters
- **Strict mode**: enabled through `RunOptions.strict` — `this` stays `undefined`, assignment to an undeclared variable throws `ReferenceError`, and `arguments` is not mapped
- **Program completion value**: `run()` returns the value of the last expression (`run("1 + 1")` returns `2`)

## Unsupported syntax and APIs

### Syntax

| Feature                                       | Description                                                                                  |
| --------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `with` statement                              | Not supported; a parse error is raised                                                       |
| Generators                                    | `function*` / `yield` / `yield*` are not supported                                           |
| `Proxy`                                       | Not supported                                                                                |
| Module syntax                                 | `import` / `export` are not supported (single-script execution)                              |
| Tagged templates                              | `` tag`...` `` is not supported                                                              |
| `new.target`                                  | Not supported                                                                                |
| `"use strict"` directive inside functions     | Not implemented; only global strict mode via `RunOptions.strict` is effective                |
| class fields / private fields                 | `class A { x = 1 }`, `#x` and `static {}` blocks are not supported                           |
| Numeric separators                            | `1_000` is not supported (ES2021)                                                            |
| Unicode identifiers                           | ASCII identifiers only; Chinese identifiers and `\u{…}` escape identifiers are not supported |
| `let`/`static`/`yield`/`await` as identifiers | Treated as keywords; sloppy legacy code such as `var await = 1` cannot be parsed             |

### Global APIs

| Content                                | Description                                                                                   |
| -------------------------------------- | --------------------------------------------------------------------------------------------- |
| `Function` constructor                 | Not exposed; use `createFunction` instead; `global: true` does not inject the host `Function` |
| `eval`                                 | Not exposed; use `run` instead; `global: true` does not inject the host `eval`                |
| `Proxy`                                | Not exposed                                                                                   |
| `console`, `wx`, `setTimeout`, etc.    | Not exposed; inject them explicitly through `options.globals`                                 |
| `Function.caller` / `arguments.caller` | Disabled                                                                                      |

### Known differences

**Global object**: the sandbox global object inherits `Object.prototype`, so `toString`, `hasOwnProperty`, `constructor` and so on are accessible as global identifiers (top-level `let`/`const` can still shadow them); injecting the host global with `global: true` skips `eval` and `Function`.

**Function reflection**: the `name`, `length` and `toString()` of function declarations/expressions/arrow functions and class methods match the source code, and anonymous functions infer `name` from the binding/property name; however, arrow functions and methods still have an own `prototype` property whose value is `undefined` (host functions cannot remove non-configurable properties), and `Class.toString()` returns the host's compiled wrapper rather than the class source.

Error paths only guarantee that an error is thrown; error types and messages may differ from a standard engine. For example, a top-level `super.x` throws `SyntaxError` in Node but `ReferenceError` in this interpreter; for `super` inside a base-class method, Node reads `Object.prototype` while this interpreter throws.

**ASI (automatic semicolon insertion)**: only a restricted set of productions is implemented — a newline after `return`/`throw`/`break`/`continue`, a newline before `++`/`--`, and a newline after `async` follow the standard (`return\n42` returns `undefined`, `throw\n` throws `ParseError`, and `async\nfunction` is no longer treated as an async function). **Statement boundaries are not enforced**: `let x = 1 let y = 2` and line continuations with missing semicolons are still accepted (a standard engine would throw `SyntaxError`).

**Resource limit boundaries**: `maxSteps` limits interpreted steps; `maxDuration` (opt-in) checks wall-clock time before and after interpreter steps and host calls, and throws `Execution aborted: exceeded N ms time limit` on timeout, but cannot interrupt the internals of a single host call or a host Promise that never settles. Parsing is constrained separately with `maxSourceLength` / `maxParseDepth` / `maxBacktracks` (by default only backtracking has a 5000 limit; the others are unlimited).

## async/await

- `await` can appear in any expression and control flow (including loops, `try/catch/finally` and `switch`)
- `run()` returns a `Promise` when the code contains async; `runSync()` throws
- WeChat Promise timing: the base library 3.8.2 baseline (iOS 14 ≤ 15) simulates Promises with `setTimeout` (macrotasks), so async timing differs from the standard; there is no difference on iOS 16+
- **Intentional extension**: a non-async arrow function inside an async function inherits the async context, so `() => await p` is valid inside an async body (a standard engine rejects it)
- **Serial contract**: a sandbox returned by `createSandbox` must be used serially — calling it again before the previous `run()` (and its returned Promise) settles throws `Runtime is not reentrant`; for concurrent execution, use multiple sandboxes or `run()`

## Platform requirements

- **WeChat mini-programs only**, minimum base library **3.8.2** (iOS 14 JSCore + Chrome 86 V8 + core-js 3.38.1)
- QQ is not supported (X5 JSCore is weaker and lacks `Array.prototype.values`/`Proxy`/`normalize`); QQ users must handle this themselves
- Not included in the `@mptool/all` full bundle; import it separately as needed
