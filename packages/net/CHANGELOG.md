# Change Log

All notable changes to this project will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
