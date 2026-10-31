# Change Log

All notable changes to this project will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.20.0](https://github.com/miniapp-tool/mptool/compare/v0.19.0...v0.20.0) (2026-10-31)

### ⚠ BREAKING CHANGES

- `Env` no longer includes `"qq"` and `env` never evaluates to `"qq"`: a QQ runtime now falls back to `"wx"` or `"js"`, so code branching on the QQ environment has to be removed.
- the QQ-only `Set-Cookie` rewriting in `CookieStore.applyHeader()` is gone; such headers are parsed as-is by `set-cookie-parser`.
- the QQ-only `theme` option is no longer passed to `wx.showModal()` by `showModal()` / `retry()`.

### ✨ Features

- **encoder:** support non-standard encoding labels in TextEncoder ([#1488](https://github.com/miniapp-tool/mptool/issues/1488)) ([9b134a8](https://github.com/miniapp-tool/mptool/commit/9b134a812fe0b2fb45fcb61c0a19bf3b7f76eb5c))

### 🚀 Performance Improvements

- **encoder:** build a reverse GB18030 index instead of scanning ([#1547](https://github.com/miniapp-tool/mptool/issues/1547)) ([dbfb0cf](https://github.com/miniapp-tool/mptool/commit/dbfb0cf1d25bb298b84c2ee9cec392b2a09a41a6))
- **encoder:** decode the gb18030 index lazily and padding-aware ([#1564](https://github.com/miniapp-tool/mptool/issues/1564)) ([4e4fb26](https://github.com/miniapp-tool/mptool/commit/4e4fb2645a92eeee8b025ce864a1bcf609bdfa7d))

### Code Refactoring

- drop QQ mini-program support ([#1498](https://github.com/miniapp-tool/mptool/issues/1498)) ([f6e43c1](https://github.com/miniapp-tool/mptool/commit/f6e43c155ed6f1fe7b843d460ba458eef2429981))
- **encoder:** drop unreachable branches and document spec guards ([#1615](https://github.com/miniapp-tool/mptool/issues/1615)) ([1788a79](https://github.com/miniapp-tool/mptool/commit/1788a791e8a93cb0436b646774a094a4c459db74))
- **encoder:** freeze the codec registries and drop a dead constructor check ([#1565](https://github.com/miniapp-tool/mptool/issues/1565)) ([85009f1](https://github.com/miniapp-tool/mptool/commit/85009f1423d34aa63e29eab39e36aaf278a92986))

### Tests

- **encoder:** raise coverage to 97.36% statements and 93.65% branches ([#1611](https://github.com/miniapp-tool/mptool/issues/1611)) ([135f8a5](https://github.com/miniapp-tool/mptool/commit/135f8a546d1b17e59d5ec2e05d1a670315050728))

### Build System

- enable isolatedDeclarations ([a763fc6](https://github.com/miniapp-tool/mptool/commit/a763fc66e994f565fe6b3bdeac0333d025a29ee9))
- keep encoder codecs when bundling on Windows ([#1477](https://github.com/miniapp-tool/mptool/issues/1477)) ([70e4fa6](https://github.com/miniapp-tool/mptool/commit/70e4fa6cda14676993e6a6a0ff9986263d7fda82))

## [0.19.0](https://github.com/miniapp-tool/mptool/compare/v0.18.1...v0.19.0) (2026-08-17)

**Note:** Version bump only for package @mptool/encoder

## [0.18.0](https://github.com/miniapp-tool/mptool/compare/v0.17.2...v0.18.0) (2026-08-12)

**Note:** Version bump only for package @mptool/encoder

## [0.17.0](https://github.com/miniapp-tool/mptool/compare/v0.16.3...v0.17.0) (2026-08-10)

**Note:** Version bump only for package @mptool/encoder

## [0.16.3](https://github.com/miniapp-tool/mptool/compare/v0.16.2...v0.16.3) (2026-08-06)

**Note:** Version bump only for package @mptool/encoder

## [0.16.2](https://github.com/miniapp-tool/mptool/compare/v0.16.1...v0.16.2) (2026-08-06)

**Note:** Version bump only for package @mptool/encoder

## [0.16.1](https://github.com/miniapp-tool/mptool/compare/v0.16.0...v0.16.1) (2026-08-06)

### Code Refactoring

- **encoder:** pack the gb18030 index table as base64 Uint16Array ([#1408](https://github.com/miniapp-tool/mptool/issues/1408)) ([5ee2057](https://github.com/miniapp-tool/mptool/commit/5ee20571c39bcecfe0f8e87c81575c905cb76781))

## [0.16.0](https://github.com/miniapp-tool/mptool/compare/v0.15.0...v0.16.0) (2026-08-06)

### 🐛 Bug Fixes

- **encoder:** align gb18030 index with the WHATWG spec ([6389640](https://github.com/miniapp-tool/mptool/commit/6389640e773d453732dd7c2e042fd3346ae4644a))
- **encoder:** keep decoder registration from being tree-shaken ([c844fe0](https://github.com/miniapp-tool/mptool/commit/c844fe0185f57f1589617c8175f87a2d3b135a9d))

## [0.15.0](https://github.com/miniapp-tool/mptool/compare/v0.14.0...v0.15.0) (2026-08-05)

### Styles

- update linter ([6fd2652](https://github.com/miniapp-tool/mptool/commit/6fd2652bc5552ea57a5d1bcaa49b6f3067ce9fbb))

### Tests

- update ([f72132b](https://github.com/miniapp-tool/mptool/commit/f72132b02627f4e26b183fcd238250259c17af7d))

### Build System

- bump deps ([bda0a5a](https://github.com/miniapp-tool/mptool/commit/bda0a5a710587959cf17163bed13a5f9697fcc7a))

## [0.14.0](/github.com/miniapp-tool/mptool/compare/v0.13.0...v0.14.0) (2026-04-22)

### ⚠ BREAKING CHANGES

- convert to pure esm and add correct polyfill for buffer

### ✨ Features

- convert to pure esm and add correct polyfill for buffer ([2f7d0c3](/github.com/miniapp-tool/mptool/commit/2f7d0c371098fef2161d6ed526200763a04cd828))

## [0.13.0](/github.com/miniapp-tool/mptool/compare/v0.12.2...v0.13.0) (2026-04-16)

**Note:** Version bump only for package @mptool/encoder

## [0.12.1](/github.com/miniapp-tool/mptool/compare/v0.12.0...v0.12.1) (2026-04-13)

**Note:** Version bump only for package @mptool/encoder

## [0.12.0](/github.com/miniapp-tool/mptool/compare/v0.11.1...v0.12.0) (2025-07-27)

**Note:** Version bump only for package @mptool/encoder

## [0.11.0](https://github.com/miniapp-tool/mptool/compare/v0.10.14...v0.11.0) (2025-04-09)

**Note:** Version bump only for package @mptool/encoder

## <small>0.10.11 (2025-02-19)</small>

- chore: tweak tests ([1c666df](https://github.com/miniapp-tool/mptool/commit/1c666df))
- chore: tweaks ([b49e7a4](https://github.com/miniapp-tool/mptool/commit/b49e7a4))
- feat: update linter ([2d4fefe](https://github.com/miniapp-tool/mptool/commit/2d4fefe))

## [0.10.0](https://github.com/miniapp-tool/mptool/compare/v0.9.1...v0.10.0) (2024-08-26)

**Note:** Version bump only for package @mptool/encoder

## [0.9.0](https://github.com/miniapp-tool/mptool/compare/v0.8.6...v0.9.0) (2024-08-03)

### ✨ Features

- refine project ([de58367](https://github.com/miniapp-tool/mptool/commit/de58367ee7ed52a842db0d1ce31b427fd61cfc34))
