# Change Log

All notable changes to this project will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.20.0](https://github.com/miniapp-tool/mptool/compare/v0.19.0...v0.20.0) (2026-10-31)

### ⚠ BREAKING CHANGES

- `Env` no longer includes `"qq"` and `env` never evaluates to `"qq"`: a QQ runtime now falls back to `"wx"` or `"js"`, so code branching on the QQ environment has to be removed.
- the QQ-only `Set-Cookie` rewriting in `CookieStore.applyHeader()` is gone; such headers are parsed as-is by `set-cookie-parser`.
- the QQ-only `theme` option is no longer passed to `wx.showModal()` by `showModal()` / `retry()`.

### ✨ Features

- **run:** add an opt-in wall-clock budget (maxDuration) ([#1607](https://github.com/miniapp-tool/mptool/issues/1607)) ([82c8863](https://github.com/miniapp-tool/mptool/commit/82c8863853f023a71834e82a3335ccaef2bbfd3d))
- **run:** expose parse budgets on every public API ([#1539](https://github.com/miniapp-tool/mptool/issues/1539)) ([04dc9a9](https://github.com/miniapp-tool/mptool/commit/04dc9a9c9a0b9f543d2d31563851ace861c50360))

### 🐛 Bug Fixes

- **metadata:** mark miniprogram-api-typings as an optional peer dependency ([#1512](https://github.com/miniapp-tool/mptool/issues/1512)) ([b242b45](https://github.com/miniapp-tool/mptool/commit/b242b45dbd484ccc239eabbafc29c215c50692de))
- **run:** add parse-time early errors for bindings and control flow ([#1575](https://github.com/miniapp-tool/mptool/issues/1575)) ([cf4f742](https://github.com/miniapp-tool/mptool/commit/cf4f742dd9310acf5a1f35b049d924dfe0a7c39d))
- **run:** add strict-mode early errors ([#1596](https://github.com/miniapp-tool/mptool/issues/1596)) ([2ad6c0f](https://github.com/miniapp-tool/mptool/commit/2ad6c0f765f8f7f23e3ba3a942d50c45156f5d9c))
- **run:** align the arguments object with ECMAScript behaviour ([#1579](https://github.com/miniapp-tool/mptool/issues/1579)) ([d566908](https://github.com/miniapp-tool/mptool/commit/d566908d172619081709fe71251f32bcca0e25de))
- **run:** always suspend a microtask at await, even for non-thenables ([#1528](https://github.com/miniapp-tool/mptool/issues/1528)) ([4515276](https://github.com/miniapp-tool/mptool/commit/4515276c839e88f16f0e1dce60f3fa07b7877b1c))
- **run:** bound speculative parsing to stop exponential backtracking ([#1519](https://github.com/miniapp-tool/mptool/issues/1519)) ([3e62e6f](https://github.com/miniapp-tool/mptool/commit/3e62e6f0347a5a5f2d6bd238a453faf5bd2e9f0f))
- **run:** close for-of iterators on abrupt loop exit ([#1582](https://github.com/miniapp-tool/mptool/issues/1582)) ([d8d9700](https://github.com/miniapp-tool/mptool/commit/d8d9700fb532501cc238e8ca0f984ef1aaf49c43))
- **run:** copy Symbol keys in object spread and rest ([#1538](https://github.com/miniapp-tool/mptool/issues/1538)) ([063bc70](https://github.com/miniapp-tool/mptool/commit/063bc70a7bd03075c2ff79c0678a762eb28c4544))
- **run:** correct object property keys, CoverInitializedName and regex/division lexing ([#1664](https://github.com/miniapp-tool/mptool/issues/1664)) ([3f41153](https://github.com/miniapp-tool/mptool/commit/3f411534cf66a27f0330a6590f1988bc5d77cad7))
- **run:** correct super property read/write semantics ([#1653](https://github.com/miniapp-tool/mptool/issues/1653)) ([4a007d7](https://github.com/miniapp-tool/mptool/commit/4a007d7880803ca03c1fbbfdde01f419c83aa72d))
- **run:** evaluate legacy octal literals by their octal value ([#1522](https://github.com/miniapp-tool/mptool/issues/1522)) ([6c40102](https://github.com/miniapp-tool/mptool/commit/6c4010219b854f85506f6b61eaaef6aab5655e24))
- **run:** fix async resumption stack accounting and try-block scoping ([#1643](https://github.com/miniapp-tool/mptool/issues/1643)) ([58bcc1a](https://github.com/miniapp-tool/mptool/commit/58bcc1aaa29e756328e047adc99b11fb744fa254))
- **run:** give base class instances a normal Object.prototype chain ([#1521](https://github.com/miniapp-tool/mptool/issues/1521)) ([9c7f633](https://github.com/miniapp-tool/mptool/commit/9c7f633a0c964b51c6a2a5860760852b98b10e7f))
- **run:** honor sloppy assignment semantics for property writes ([#1530](https://github.com/miniapp-tool/mptool/issues/1530)) ([3f2381d](https://github.com/miniapp-tool/mptool/commit/3f2381d299b0080f7b2deb88058059cb02288a59))
- **run:** implement ASI restricted productions ([#1574](https://github.com/miniapp-tool/mptool/issues/1574)) ([258cfd4](https://github.com/miniapp-tool/mptool/commit/258cfd425ee7f993f4e6778fada1a3c0bec530b1))
- **run:** infer function names and expose class method source ([#1595](https://github.com/miniapp-tool/mptool/issues/1595)) ([65ceba2](https://github.com/miniapp-tool/mptool/commit/65ceba2de5fc4dcf07b2ad0bbe35687ff65edebe))
- **run:** infer function names only for anonymous function definitions ([#1620](https://github.com/miniapp-tool/mptool/issues/1620)) ([e453fb2](https://github.com/miniapp-tool/mptool/commit/e453fb2cc75376407e0628ed44edbd310633bd26))
- **run:** inherit Object.prototype on the sandbox global, filter eval/Function ([#1580](https://github.com/miniapp-tool/mptool/issues/1580)) ([ab293a1](https://github.com/miniapp-tool/mptool/commit/ab293a180eaad8a0edf9a11f49ea6d4e423c0817))
- **run:** keep global mirroring scoped to var-like bindings and drop ES2020 syntax ([#1668](https://github.com/miniapp-tool/mptool/issues/1668)) ([d2e6f64](https://github.com/miniapp-tool/mptool/commit/d2e6f645f3fc5e5d8d865dda4032c856617649a8))
- **run:** lex regex literals correctly at statement boundaries ([#1594](https://github.com/miniapp-tool/mptool/issues/1594)) ([f1eb232](https://github.com/miniapp-tool/mptool/commit/f1eb2320de3742e81264ea22f8745874d32ba416))
- **run:** make Runtime reject nested or concurrent runs ([#1581](https://github.com/miniapp-tool/mptool/issues/1581)) ([48f3a5c](https://github.com/miniapp-tool/mptool/commit/48f3a5c7ac5fe1e782df3259e9cfa9d8f0559890))
- **run:** match function reflection for name, length and toString ([#1578](https://github.com/miniapp-tool/mptool/issues/1578)) ([0fcf55d](https://github.com/miniapp-tool/mptool/commit/0fcf55dacb5c65ce1b9805270dcac032e648ff7e))
- **run:** normalize CRLF and CR to LF in template cooked values ([#1535](https://github.com/miniapp-tool/mptool/issues/1535)) ([e3bc1d3](https://github.com/miniapp-tool/mptool/commit/e3bc1d381bfb32df8dbbd877f2b4d9d7efd8ac00))
- **run:** only reject runSync when async code actually starts ([#1527](https://github.com/miniapp-tool/mptool/issues/1527)) ([73220f8](https://github.com/miniapp-tool/mptool/commit/73220f8115549899390f7561edfbf19c2f282f37))
- **run:** predeclare lexical bindings and give switch a block scope ([#1577](https://github.com/miniapp-tool/mptool/issues/1577)) ([4c35736](https://github.com/miniapp-tool/mptool/commit/4c3573643199c6345a43b2c820505cfb6fbcb62d))
- **run:** propagate optional-chain short-circuiting through the whole chain ([#1520](https://github.com/miniapp-tool/mptool/issues/1520)) ([3a69013](https://github.com/miniapp-tool/mptool/commit/3a69013bb484406d84ce6cc30e0b93843821732c))
- **run:** release maxStack depth when the overflow error is thrown ([#1526](https://github.com/miniapp-tool/mptool/issues/1526)) ([b5732f7](https://github.com/miniapp-tool/mptool/commit/b5732f73ebb34976339a3e9bd4256698ed06a034))
- **run:** reset execution budget for host-called functions and fix createFunction plumbing ([#1662](https://github.com/miniapp-tool/mptool/issues/1662)) ([6023cee](https://github.com/miniapp-tool/mptool/commit/6023ceeb1ec259fe8be0ae47692f68558594355e))
- **run:** resolve compound-assignment targets exactly once ([#1523](https://github.com/miniapp-tool/mptool/issues/1523)) ([796ebb9](https://github.com/miniapp-tool/mptool/commit/796ebb9177927750dd027967d46e81d34339a8e5))
- **run:** skip computed keys of short-circuited delete chains ([#1537](https://github.com/miniapp-tool/mptool/issues/1537)) ([d83c03d](https://github.com/miniapp-tool/mptool/commit/d83c03d25128a217ae60f3f912c77bd33be146f7))
- **run:** strip quotes from string-literal property names ([#1576](https://github.com/miniapp-tool/mptool/issues/1576)) ([4d72f17](https://github.com/miniapp-tool/mptool/commit/4d72f17e9b3b76fe9f814b3f8176447c1035437d))
- **run:** support super() inside arrows created by a derived constructor ([#1529](https://github.com/miniapp-tool/mptool/issues/1529)) ([7b3141b](https://github.com/miniapp-tool/mptool/commit/7b3141b74f2c457dac65948767c20e90aaf58ce9))
- **run:** throw TypeError when a template interpolation is a Symbol ([#1536](https://github.com/miniapp-tool/mptool/issues/1536)) ([0f25119](https://github.com/miniapp-tool/mptool/commit/0f251198d0838dffb675f8a8c04ece846f7684c7))

### 🚀 Performance Improvements

- **run:** memoize async-path AST scans per node ([#1583](https://github.com/miniapp-tool/mptool/issues/1583)) ([09a7a2a](https://github.com/miniapp-tool/mptool/commit/09a7a2a9ffd4da14dd23b585a1da79b4d555afdc))

### Documentation

- sync run/parser package READMEs and known limitations ([#1597](https://github.com/miniapp-tool/mptool/issues/1597)) ([a0c6d30](https://github.com/miniapp-tool/mptool/commit/a0c6d30d858d93935a9bfe7a513fdf71d8590f46))

### Miscellaneous Chores

- **run:** remove a leftover debug log from function hoisting ([#1599](https://github.com/miniapp-tool/mptool/issues/1599)) ([03bf9f1](https://github.com/miniapp-tool/mptool/commit/03bf9f1a404d81d8a2efae4061082cbb087a026f))

### Code Refactoring

- drop QQ mini-program support ([#1498](https://github.com/miniapp-tool/mptool/issues/1498)) ([f6e43c1](https://github.com/miniapp-tool/mptool/commit/f6e43c155ed6f1fe7b843d460ba458eef2429981))

### Tests

- **run:** fix oxlint prefer-string-raw warnings ([41f8b85](https://github.com/miniapp-tool/mptool/commit/41f8b8586b78c21f2062685023a6cebf5325ee4d))
- **run:** organize interpreter regression specs by topic ([#1532](https://github.com/miniapp-tool/mptool/issues/1532)) ([6049e44](https://github.com/miniapp-tool/mptool/commit/6049e440b136576198b804374522c33de7e69493))
- **run:** reach 100% coverage for statements, branches, functions and lines ([#1623](https://github.com/miniapp-tool/mptool/issues/1623)) ([ca8c165](https://github.com/miniapp-tool/mptool/commit/ca8c1659240461defc329132c2eb050328aaa7e5))

### Build System

- bump deps ([636a113](https://github.com/miniapp-tool/mptool/commit/636a113b6abb011973e599b694d3fc0dc6e50d6c))
- enable isolatedDeclarations ([a763fc6](https://github.com/miniapp-tool/mptool/commit/a763fc66e994f565fe6b3bdeac0333d025a29ee9))

## [0.19.0](https://github.com/miniapp-tool/mptool/compare/v0.18.1...v0.19.0) (2026-08-17)

**Note:** Version bump only for package @mptool/run

## [0.18.1](https://github.com/miniapp-tool/mptool/compare/v0.18.0...v0.18.1) (2026-08-12)

### 🐛 Bug Fixes

- **run:** use strict ASCII identifier names for device compatibility ([728a3b5](https://github.com/miniapp-tool/mptool/commit/728a3b53ddbd275846b82824e88ba36d4756691c))

## [0.18.0](https://github.com/miniapp-tool/mptool/compare/v0.17.2...v0.18.0) (2026-08-12)

**Note:** Version bump only for package @mptool/run

## [0.17.1](https://github.com/miniapp-tool/mptool/compare/v0.17.0...v0.17.1) (2026-08-10)

### 🐛 Bug Fixes

- **run:** fix miniprogram packing ([30f5a20](https://github.com/miniapp-tool/mptool/commit/30f5a20b39424c7dcf20397469d79da4c342526e))

## [0.17.0](https://github.com/miniapp-tool/mptool/compare/v0.16.3...v0.17.0) (2026-08-10)

### ✨ Features

- **run:** add @mptool/run package ([#1415](https://github.com/miniapp-tool/mptool/issues/1415)) ([0c284fb](https://github.com/miniapp-tool/mptool/commit/0c284fbe4cc4271c6d6e31d52cb4e3336b6df05c))

### Build System

- bump deps ([66737b6](https://github.com/miniapp-tool/mptool/commit/66737b6c01a164bbf5597cb7a01db44460df20d6))

# Change Log
