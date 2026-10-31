# Change Log

All notable changes to this project will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.20.0](https://github.com/miniapp-tool/mptool/compare/v0.19.0...v0.20.0) (2026-10-31)

### ⚠ BREAKING CHANGES

- `Env` no longer includes `"qq"` and `env` never evaluates to `"qq"`: a QQ runtime now falls back to `"wx"` or `"js"`, so code branching on the QQ environment has to be removed.
- the QQ-only `Set-Cookie` rewriting in `CookieStore.applyHeader()` is gone; such headers are parsed as-is by `set-cookie-parser`.
- the QQ-only `theme` option is no longer passed to `wx.showModal()` by `showModal()` / `retry()`.

### ✨ Features

- **net:** add request cancellation, timeout and retry ([#1513](https://github.com/miniapp-tool/mptool/issues/1513)) ([f7bd9e1](https://github.com/miniapp-tool/mptool/commit/f7bd9e1d1ddb48da32e245749042bf50ae0f7932))

### 🐛 Bug Fixes

- **deps:** move build-time-inlined dependencies to devDependencies ([#1487](https://github.com/miniapp-tool/mptool/issues/1487)) ([2beef8c](https://github.com/miniapp-tool/mptool/commit/2beef8c115e2e35bdd20b3d245e9a942071fbf18))
- **metadata:** mark miniprogram-api-typings as an optional peer dependency ([#1512](https://github.com/miniapp-tool/mptool/issues/1512)) ([b242b45](https://github.com/miniapp-tool/mptool/commit/b242b45dbd484ccc239eabbafc29c215c50692de))
- **net:** accept upper-case schemes and protocol-relative URLs ([#1654](https://github.com/miniapp-tool/mptool/issues/1654)) ([2d017ca](https://github.com/miniapp-tool/mptool/commit/2d017ca14d53dfa20591a009bdac941d33a036b6))
- **net:** batch cookie storage writes and cap the cookie jar ([#1500](https://github.com/miniapp-tool/mptool/issues/1500)) ([c7abeb3](https://github.com/miniapp-tool/mptool/commit/c7abeb3cb0954d48e4154c90ee15488cf7f522e1))
- **net:** enforce the Headers contract and normalize cookie domains ([#1514](https://github.com/miniapp-tool/mptool/issues/1514)) ([4b8524c](https://github.com/miniapp-tool/mptool/commit/4b8524c691352f9db708eb8be5bc76c07dc94978))
- **net:** join custom Cookie header and cookieStore with "; " ([#1644](https://github.com/miniapp-tool/mptool/issues/1644)) ([868c711](https://github.com/miniapp-tool/mptool/commit/868c7110d63f4c5f3d486ca057d93842e976663f))
- **net:** keep percent-encoded cookie values raw when parsing Set-Cookie ([#1652](https://github.com/miniapp-tool/mptool/issues/1652)) ([823ce2a](https://github.com/miniapp-tool/mptool/commit/823ce2a9d5212f7d6d6006a6263774f329e8c7f5))
- **net:** key cookies by name, domain and path ([#1496](https://github.com/miniapp-tool/mptool/issues/1496)) ([68b3173](https://github.com/miniapp-tool/mptool/commit/68b3173d3abdcd1e9d2ecfc517219943508c942a)), references [#1497](https://github.com/miniapp-tool/mptool/issues/1497)
- **net:** list cookies from every path in CookieStore.list ([#1645](https://github.com/miniapp-tool/mptool/issues/1645)) ([aa400b3](https://github.com/miniapp-tool/mptool/commit/aa400b37fef31e39a0ee6d82d4daafaccac5604c))
- **net:** persist Secure and SameSite cookie attributes ([#1509](https://github.com/miniapp-tool/mptool/issues/1509)) ([bffa5e2](https://github.com/miniapp-tool/mptool/commit/bffa5e26abf27e3f16869766b8e69ad193b7f8ba))
- **net:** redact credentials and cap bodies in debug logs ([#1570](https://github.com/miniapp-tool/mptool/issues/1570)) ([fbe08de](https://github.com/miniapp-tool/mptool/commit/fbe08defb5da4d6bc86865eba6029d9b40b106f4))
- **net:** reject request urls and cookie scopes without a domain ([#1517](https://github.com/miniapp-tool/mptool/issues/1517)) ([3568a31](https://github.com/miniapp-tool/mptool/commit/3568a3173ca51064173b616e3d5713b19e7f07d9))
- **net:** send cookies in RFC 6265 priority order ([#1497](https://github.com/miniapp-tool/mptool/issues/1497)) ([9e96037](https://github.com/miniapp-tool/mptool/commit/9e96037eaad01cc6fc8fbb1bbf74e6fe33734536))
- **net:** stop callers from overriding request callbacks ([#1499](https://github.com/miniapp-tool/mptool/issues/1499)) ([c678d84](https://github.com/miniapp-tool/mptool/commit/c678d84c0fd0c80a12381fe17e9066dbd8b946bd))
- **net:** validate cookie Domain and keep host-only cookies host-only ([#1481](https://github.com/miniapp-tool/mptool/issues/1481)) ([1fea35c](https://github.com/miniapp-tool/mptool/commit/1fea35cc1caf01b9926cb3e521731ff1487434ec))

### Documentation

- **net:** clarify which URLSearchParams class the body accepts ([#1571](https://github.com/miniapp-tool/mptool/issues/1571)) ([aa4569f](https://github.com/miniapp-tool/mptool/commit/aa4569fbb195f5d14f514baa82d07ef20af79fec))

### Styles

- fix linter ([ffee079](https://github.com/miniapp-tool/mptool/commit/ffee0793fe429a14bf756c794ac770209f086b1a))

### Miscellaneous Chores

- **deps:** update dependency set-cookie-parser to v3.1.3 ([#1462](https://github.com/miniapp-tool/mptool/issues/1462)) ([e2ad378](https://github.com/miniapp-tool/mptool/commit/e2ad378c4b6f08e38b29d06dfe844ae6eb406327))
- **deps:** update dependency set-cookie-parser to v3.1.4 ([#1473](https://github.com/miniapp-tool/mptool/issues/1473)) ([49d9835](https://github.com/miniapp-tool/mptool/commit/49d98359e55c987d11aa1bbfa81a8b5be8b7d4b5))
- **deps:** upgrade dependencies and pnpm to v12.15.0 ([7e04438](https://github.com/miniapp-tool/mptool/commit/7e04438aa85d3998cdeabb47a7d32a53266d2f6b))

### Code Refactoring

- drop QQ mini-program support ([#1498](https://github.com/miniapp-tool/mptool/issues/1498)) ([f6e43c1](https://github.com/miniapp-tool/mptool/commit/f6e43c155ed6f1fe7b843d460ba458eef2429981))

### Tests

- **net:** raise @mptool/net coverage to 100% ([#1614](https://github.com/miniapp-tool/mptool/issues/1614)) ([473abfa](https://github.com/miniapp-tool/mptool/commit/473abfa5c09a7d1d146532726444c4a0986f6328))

### Build System

- bump deps ([636a113](https://github.com/miniapp-tool/mptool/commit/636a113b6abb011973e599b694d3fc0dc6e50d6c))
- enable isolatedDeclarations ([a763fc6](https://github.com/miniapp-tool/mptool/commit/a763fc66e994f565fe6b3bdeac0333d025a29ee9))

## [0.19.0](https://github.com/miniapp-tool/mptool/compare/v0.18.1...v0.19.0) (2026-08-17)

**Note:** Version bump only for package @mptool/net

## [0.18.0](https://github.com/miniapp-tool/mptool/compare/v0.17.2...v0.18.0) (2026-08-12)

**Note:** Version bump only for package @mptool/net

## [0.17.0](https://github.com/miniapp-tool/mptool/compare/v0.16.3...v0.17.0) (2026-08-10)

### Build System

- bump deps ([66737b6](https://github.com/miniapp-tool/mptool/commit/66737b6c01a164bbf5597cb7a01db44460df20d6))

## [0.16.3](https://github.com/miniapp-tool/mptool/compare/v0.16.2...v0.16.3) (2026-08-06)

**Note:** Version bump only for package @mptool/net

## [0.16.2](https://github.com/miniapp-tool/mptool/compare/v0.16.1...v0.16.2) (2026-08-06)

**Note:** Version bump only for package @mptool/net

## [0.16.0](https://github.com/miniapp-tool/mptool/compare/v0.15.0...v0.16.0) (2026-08-06)

### 🐛 Bug Fixes

- **net:** clear both legacy and normalized cookie keys ([3a9a260](https://github.com/miniapp-tool/mptool/commit/3a9a260d629b26f53a4435b70d44b1a7d4a3fc97))
- **net:** decode URLSearchParams leniently like the native API ([58adf3c](https://github.com/miniapp-tool/mptool/commit/58adf3cba21587f13292565a91b618d81069c228))
- **net:** keep NUL encoded as %00 in URLSearchParams ([1795bca](https://github.com/miniapp-tool/mptool/commit/1795bca2e8d95602aea95c414f77e9cbdcc1a00f))
- **net:** normalize cookie domain across all write paths ([6a7030a](https://github.com/miniapp-tool/mptool/commit/6a7030aa12d4ed221d89ec5412e64912671e2f07))
- **net:** normalize leading/trailing whitespace in header values ([1b92d3a](https://github.com/miniapp-tool/mptool/commit/1b92d3a1954e65e8808c4c88e08c5d10dd6a2a5b))
- **net:** rewrite URLSearchParams to align with native behavior ([8b9379e](https://github.com/miniapp-tool/mptool/commit/8b9379e17bb9d9c12cd736965c2dd11a8d799ad3))
- **net:** treat invalid cookie expiry as session and parse protocol-relative urls ([5f5c496](https://github.com/miniapp-tool/mptool/commit/5f5c496193e85a3a581801f8087e56ee3c033165))

### Code Refactoring

- **net:** drop legacy cookie key compatibility ([2d0c3f4](https://github.com/miniapp-tool/mptool/commit/2d0c3f47d42209f720cc2b9bb0da75496626ef5c))

## [0.15.0](https://github.com/miniapp-tool/mptool/compare/v0.14.0...v0.15.0) (2026-08-05)

### ✨ Features

- improve mock ([e2dc48e](https://github.com/miniapp-tool/mptool/commit/e2dc48ed15151c879f247ad089b5e7560e64b27d))

### 🐛 Bug Fixes

- **net:** correct cookie scope for repeated labels and bind forEach once ([64f559f](https://github.com/miniapp-tool/mptool/commit/64f559fc2100a08a7a3446742b731b7c55bc8a61))
- **net:** match cookie path at segment boundary ([14d1e01](https://github.com/miniapp-tool/mptool/commit/14d1e014d740656b4a81175dadd81e68d2dcf62e))
- **net:** preserve duplicate values in URLSearchParams[#values](https://github.com/miniapp-tool/mptool/issues/values) ([1663942](https://github.com/miniapp-tool/mptool/commit/166394207da2335bb6533191cbffc7e8214ae354))

### Styles

- update linter ([6fd2652](https://github.com/miniapp-tool/mptool/commit/6fd2652bc5552ea57a5d1bcaa49b6f3067ce9fbb))

### Miscellaneous Chores

- **deps:** update dependency miniprogram-api-typings to v5.1.3 ([#1313](https://github.com/miniapp-tool/mptool/issues/1313)) ([2067f41](https://github.com/miniapp-tool/mptool/commit/2067f414e9b742f2661213494f84d902e1519f54))
- **deps:** update dependency miniprogram-api-typings to v5.2.0 ([#1333](https://github.com/miniapp-tool/mptool/issues/1333)) ([66df6b5](https://github.com/miniapp-tool/mptool/commit/66df6b588cc0acce001ee27e59d4124f16cf2273))
- **deps:** update dependency miniprogram-api-typings to v5.2.1 ([#1340](https://github.com/miniapp-tool/mptool/issues/1340)) ([3f9ecf5](https://github.com/miniapp-tool/mptool/commit/3f9ecf5eec8f12772baafddb430a6734f127fe04))
- **deps:** update dependency miniprogram-api-typings to v5.2.2 ([#1397](https://github.com/miniapp-tool/mptool/issues/1397)) ([7a20b1d](https://github.com/miniapp-tool/mptool/commit/7a20b1dd3756157d31871428479cff678506fe72))
- **deps:** update dependency set-cookie-parser to v3.1.1 ([#1368](https://github.com/miniapp-tool/mptool/issues/1368)) ([202928a](https://github.com/miniapp-tool/mptool/commit/202928aab8a05071f291dcb9b9273c56de2bec2f))
- **deps:** update dependency set-cookie-parser to v3.1.2 ([#1381](https://github.com/miniapp-tool/mptool/issues/1381)) ([6748649](https://github.com/miniapp-tool/mptool/commit/674864947e851dd56c54121ac30d4696caf48059))

### Tests

- fix test pollution and strengthen assertions after review ([f9878f6](https://github.com/miniapp-tool/mptool/commit/f9878f61d32863e478b1e868c2dc26ad0108db74))
- **net:** add tests for Cookie class ([6ef773e](https://github.com/miniapp-tool/mptool/commit/6ef773ebc4fc09daf547dbae28c62f0f8cc79027))
- **net:** cover cookieStore apply and applyHeader ([e3a86ba](https://github.com/miniapp-tool/mptool/commit/e3a86baa19a2d118454120961c7f217f14d03ebb))
- **net:** cover request content-type, cookie and failure ([b2dfbb8](https://github.com/miniapp-tool/mptool/commit/b2dfbb8097a5b48799f31b7449db3e9079b5f5c1))
- **net:** push coverage toward 100% ([0b0036f](https://github.com/miniapp-tool/mptool/commit/0b0036f07fd76e1a212c36fa2bad2d0dd7f521ba))

## [0.14.0](/github.com/miniapp-tool/mptool/compare/v0.13.0...v0.14.0) (2026-04-22)

### ⚠ BREAKING CHANGES

- convert to pure esm and add correct polyfill for buffer

### ✨ Features

- convert to pure esm and add correct polyfill for buffer ([2f7d0c3](/github.com/miniapp-tool/mptool/commit/2f7d0c371098fef2161d6ed526200763a04cd828))

## [0.13.0](/github.com/miniapp-tool/mptool/compare/v0.12.2...v0.13.0) (2026-04-16)

**Note:** Version bump only for package @mptool/net

## [0.12.1](/github.com/miniapp-tool/mptool/compare/v0.12.0...v0.12.1) (2026-04-13)

### 🚀 Performance Improvements

- improve perf ([30df205](/github.com/miniapp-tool/mptool/commit/30df205d45bcf921c110bc3baf612d0477096902))

## [0.12.0](/github.com/miniapp-tool/mptool/compare/v0.11.1...v0.12.0) (2025-07-27)

### ✨ Features

- bump deps ([3636bdc](/github.com/miniapp-tool/mptool/commit/3636bdcd328ff5453b3b9bfde78a035e3dc6c08a))

## [0.11.0](https://github.com/miniapp-tool/mptool/compare/v0.10.14...v0.11.0) (2025-04-09)

**Note:** Version bump only for package @mptool/net

## <small>0.10.14 (2025-03-10)</small>

**Note:** Version bump only for package @mptool/net

## <small>0.10.13 (2025-03-10)</small>

**Note:** Version bump only for package @mptool/net

## <small>0.10.12 (2025-03-03)</small>

- feat(net): improve cookieStore ([f0d3e81](https://github.com/miniapp-tool/mptool/commit/f0d3e81))
- chore: tweaks ([62d3648](https://github.com/miniapp-tool/mptool/commit/62d3648))

## <small>0.10.11 (2025-02-19)</small>

- chore: tweaks ([b49e7a4](https://github.com/miniapp-tool/mptool/commit/b49e7a4))
- chore: tweaks ([5d6a952](https://github.com/miniapp-tool/mptool/commit/5d6a952))
- chore(deps): update dependency miniprogram-api-typings to v4.0.2 (#863) ([f736bab](https://github.com/miniapp-tool/mptool/commit/f736bab)), closes [#863](https://github.com/miniapp-tool/mptool/issues/863)
- chore(deps): update dependency miniprogram-api-typings to v4.0.4 (#923) ([07e8c42](https://github.com/miniapp-tool/mptool/commit/07e8c42)), closes [#923](https://github.com/miniapp-tool/mptool/issues/923)
- chore(deps): update dependency miniprogram-api-typings to v4.0.5 (#948) ([c7d90f3](https://github.com/miniapp-tool/mptool/commit/c7d90f3)), closes [#948](https://github.com/miniapp-tool/mptool/issues/948)
- chore(deps): update dependency set-cookie-parser to v2.7.1 ([3710d79](https://github.com/miniapp-tool/mptool/commit/3710d79))
- feat: update linter ([2d4fefe](https://github.com/miniapp-tool/mptool/commit/2d4fefe))

## <small>0.10.10 (2024-10-12)</small>

- feat: use miniprogram-api-typings v4 ([071d8a5](https://github.com/miniapp-tool/mptool/commit/071d8a5))

## <small>0.10.9 (2024-10-06)</small>

- feat: use miniprogram-api-typings v4 ([10d6856](https://github.com/miniapp-tool/mptool/commit/10d6856))

## <small>0.10.8 (2024-08-30)</small>

- chore: tweaks ([e4d7727](https://github.com/miniapp-tool/mptool/commit/e4d7727))

## <small>0.10.3 (2024-08-29)</small>

- feat: improve api ([3cb8dd9](https://github.com/miniapp-tool/mptool/commit/3cb8dd9))

## [0.10.0](https://github.com/miniapp-tool/mptool/compare/v0.9.1...v0.10.0) (2024-08-26)

**Note:** Version bump only for package @mptool/net

## [0.9.1](https://github.com/miniapp-tool/mptool/compare/v0.9.0...v0.9.1) (2024-08-25)

### 🐛 Bug Fixes

- **net:** fix url parsing ([5484801](https://github.com/miniapp-tool/mptool/commit/5484801e4c89e8a0e38f06be49af72ce105303ab))

## [0.9.0](https://github.com/miniapp-tool/mptool/compare/v0.8.6...v0.9.0) (2024-08-03)

### ✨ Features

- refine project ([de58367](https://github.com/miniapp-tool/mptool/commit/de58367ee7ed52a842db0d1ce31b427fd61cfc34))
