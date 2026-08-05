# Change Log

All notable changes to this project will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.15.0](https://github.com/miniapp-tool/mptool/compare/v0.14.0...v0.15.0) (2026-08-05)

### ✨ Features

- improve mock ([e2dc48e](https://github.com/miniapp-tool/mptool/commit/e2dc48ed15151c879f247ad089b5e7560e64b27d))
- **mock:** add new api ([98bdc1f](https://github.com/miniapp-tool/mptool/commit/98bdc1f14b437260909b18fb8afe96c1dd175d88))
- **mock:** cover more common wx apis ([c066bfc](https://github.com/miniapp-tool/mptool/commit/c066bfc4352587f06f088f66ea6cd4b8b4970139))
- **mock:** improve api mock ([93414ae](https://github.com/miniapp-tool/mptool/commit/93414ae41dbd5d0f4db8795037916f5c2a1addef))

### 🐛 Bug Fixes

- **mock:** align FileSystemManager signatures with wx api ([6e1f8df](https://github.com/miniapp-tool/mptool/commit/6e1f8dff6326234576e67a373919c043cad7ebaa))
- **mock:** correct limitSize to 10MB in storage info ([2b635a3](https://github.com/miniapp-tool/mptool/commit/2b635a32aacb90efcfe67776a6d88863f6dca380))
- **mock:** return filePath when downloadFile receives filePath ([eb24b63](https://github.com/miniapp-tool/mptool/commit/eb24b63c8d5eadece02ee6d580c588c31699bf97))
- **mock:** return full WifiInfo in getConnectedWifi ([ea6925d](https://github.com/miniapp-tool/mptool/commit/ea6925d934f49f95af3663bfa91e46bb235ad693))
- **mock:** return singleton FileSystemManager ([ae07258](https://github.com/miniapp-tool/mptool/commit/ae072588654b910249b98075bc542e24224fb72f))

### Styles

- update linter ([6fd2652](https://github.com/miniapp-tool/mptool/commit/6fd2652bc5552ea57a5d1bcaa49b6f3067ce9fbb))

### Tests

- **file:** cover error branches and align mock fs with wx behavior ([68243f7](https://github.com/miniapp-tool/mptool/commit/68243f70827495cfa0b2c3892a331c6ec0be612f))
- fix test pollution and strengthen assertions after review ([f9878f6](https://github.com/miniapp-tool/mptool/commit/f9878f61d32863e478b1e868c2dc26ad0108db74))
- **mock:** add tests for downloadFile ([872e599](https://github.com/miniapp-tool/mptool/commit/872e599023aedcedd1b4a14d379463c6f2139b6a))
- **mock:** add tests for file system, network, ui and framework mocks ([6a1106f](https://github.com/miniapp-tool/mptool/commit/6a1106f2a09f70e7eefa270e7f1a9007f0204c06))
- **mock:** cover more ui apis ([7cc3bb1](https://github.com/miniapp-tool/mptool/commit/7cc3bb160a77a1b541903ddab76b0677de8484af))
- **mock:** cover navigation methods and request callbacks ([15d1644](https://github.com/miniapp-tool/mptool/commit/15d1644fa5003f2979043820c92da876d67e9313))
- **net:** push coverage toward 100% ([0b0036f](https://github.com/miniapp-tool/mptool/commit/0b0036f07fd76e1a212c36fa2bad2d0dd7f521ba))

### Build System

- bump deps ([1a63935](https://github.com/miniapp-tool/mptool/commit/1a63935289b5619265893465c1a21ab6a7ca478d))
- bump deps ([bda0a5a](https://github.com/miniapp-tool/mptool/commit/bda0a5a710587959cf17163bed13a5f9697fcc7a))

## [0.14.0](/github.com/miniapp-tool/mptool/compare/v0.13.0...v0.14.0) (2026-04-22)

### ⚠ BREAKING CHANGES

- convert to pure esm and add correct polyfill for buffer

### ✨ Features

- convert to pure esm and add correct polyfill for buffer ([2f7d0c3](/github.com/miniapp-tool/mptool/commit/2f7d0c371098fef2161d6ed526200763a04cd828))

## [0.13.0](/github.com/miniapp-tool/mptool/compare/v0.12.2...v0.13.0) (2026-04-16)

**Note:** Version bump only for package @mptool/mock

## [0.12.1](/github.com/miniapp-tool/mptool/compare/v0.12.0...v0.12.1) (2026-04-13)

**Note:** Version bump only for package @mptool/mock

## [0.12.0](/github.com/miniapp-tool/mptool/compare/v0.11.1...v0.12.0) (2025-07-27)

### ✨ Features

- bump deps ([3636bdc](/github.com/miniapp-tool/mptool/commit/3636bdcd328ff5453b3b9bfde78a035e3dc6c08a))

## [0.11.0](https://github.com/miniapp-tool/mptool/compare/v0.10.14...v0.11.0) (2025-04-09)

**Note:** Version bump only for package @mptool/mock

## <small>0.10.11 (2025-02-19)</small>

- chore: tweaks ([b49e7a4](https://github.com/miniapp-tool/mptool/commit/b49e7a4))
- chore: tweaks ([5d6a952](https://github.com/miniapp-tool/mptool/commit/5d6a952))
- build: bump deps ([83d6a8b](https://github.com/miniapp-tool/mptool/commit/83d6a8b))
- build: bump deps ([ce3ce42](https://github.com/miniapp-tool/mptool/commit/ce3ce42))
- feat: update linter ([2d4fefe](https://github.com/miniapp-tool/mptool/commit/2d4fefe))

## <small>0.10.10 (2024-10-12)</small>

- feat: use miniprogram-api-typings v4 ([071d8a5](https://github.com/miniapp-tool/mptool/commit/071d8a5))

## <small>0.10.9 (2024-10-06)</small>

- feat: use miniprogram-api-typings v4 ([10d6856](https://github.com/miniapp-tool/mptool/commit/10d6856))

## [0.10.0](https://github.com/miniapp-tool/mptool/compare/v0.9.1...v0.10.0) (2024-08-26)

**Note:** Version bump only for package @mptool/mock

## [0.9.1](https://github.com/miniapp-tool/mptool/compare/v0.9.0...v0.9.1) (2024-08-25)

**Note:** Version bump only for package @mptool/mock

## [0.9.0](https://github.com/miniapp-tool/mptool/compare/v0.8.6...v0.9.0) (2024-08-03)

**Note:** Version bump only for package @mptool/mock
