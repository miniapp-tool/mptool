# AGENTS.md

## Project Overview

**mptool** is a lightweight mini-program (小程序) enhancement framework for QQ/WeChat mini-apps.

- **Repository**: [miniapp-tool/mptool](https://github.com/miniapp-tool/mptool)
- **Author**: Mr.Hope (mister-hope@outlook.com)
- **Package Manager**: pnpm

## Architecture

### Packages

| Package                   | Description                                                                    |
| ------------------------- | ------------------------------------------------------------------------------ |
| `@mptool/all`             | Full bundle (api, enhance, file, net, parser), single-file build               |
| `@mptool/enhance`         | Communication framework with enhanced lifecycles                               |
| `@mptool/file`            | File and storage API with expiration support                                   |
| `@mptool/net`             | Network API with Headers, URLSearchParams, Cookie support                      |
| `@mptool/parser`          | HTML parser for rich-text                                                      |
| `@mptool/encoder`         | GBK and GB2312 encoding support                                                |
| `@mptool/api`             | Common API utilities (media, network, ui)                                      |
| `@mptool/mock`            | wx API mock for testing (storage, file system, network, ui, device, framework) |
| `@mptool/shared`          | Shared utilities (emitter, logger, queue, type, etc.)                          |
| `@mptool/skyline`         | Bundle for WeChat dist 3.0                                                     |
| `@mptool/skyline-enhance` | Lifetime enhance for WeChat dist 3.0 (slim version of `@mptool/enhance`)       |

### Dependency Graph

Workspace packages are bundled into single files at build time (tsdown), so runtime dependencies are minimal; most inter-package references are dev dependencies.

```
@mptool/all
├── @mptool/api (dev)
├── @mptool/enhance (dev)
├── @mptool/file (dev)
├── @mptool/net (dev)
└── @mptool/parser (dev)

@mptool/api
├── @mptool/shared (dev)
└── @mptool/mock (dev)

@mptool/enhance
├── @mptool/shared (dev)
└── @mptool/mock (dev)

@mptool/file
├── @mptool/shared (dev)
└── @mptool/mock (dev)

@mptool/net
├── @mptool/shared
├── set-cookie-parser (dev)
└── @mptool/mock (dev)

@mptool/parser
├── @mptool/shared
├── cheerio
├── domhandler
└── @mptool/mock (dev)

@mptool/shared
├── base64-arraybuffer (dev)
└── @mptool/mock (dev)

@mptool/skyline
├── @mptool/file (dev)
├── @mptool/net (dev)
├── @mptool/parser (dev)
└── @mptool/skyline-enhance (dev)

@mptool/skyline-enhance
├── @mptool/shared (dev)
└── @mptool/mock (dev)
```

All packages (except `@mptool/encoder` and `@mptool/mock`) declare `miniprogram-api-typings` as a peer dependency; `@mptool/mock` depends on it directly.

## Development Conventions

### Code Style

- Use **oxlint** for linting
- Use **oxfmt** for formatting
- Use **tsdown** for building
- Use **vitest** for testing (with istanbul coverage)
- Use **Conventional Commits** for commit messages
- Commits are guarded by **husky** + **nano-staged** (auto lint/format on staged files)

### Build Commands

```sh
pnpm run build          # sync enhance → build all packages
pnpm run dev            # sync enhance → dev all packages
pnpm run clean          # Clean dist files
pnpm run test           # Run tests with coverage (vitest run --coverage)
pnpm run lint           # oxlint --fix + oxfmt
pnpm run lint:check     # oxlint + oxfmt --check (CI)
pnpm run copy           # Copy @mptool/all dist to demo (scripts/copy-package.ts)
pnpm run release        # clean → build → version → publish → sync
```

### Enhance ↔ Skyline-Enhance Sync

`@mptool/skyline-enhance` is a slim version of `@mptool/enhance` (no `onNavigate`/`onPreload`/`onAppLaunch`/navigation lock). The 11 shared files (app/index, app/typings, component/index, component/store, config/index, emitter/index, emitter/typings, navigator/index, navigator/typings, page/index, index.ts) are **copied from `@mptool/enhance` to `@mptool/skyline-enhance`** by `scripts/sync-enhance.ts` before every build/dev run.

### Package Structure

Each package follows this structure:

```text
packages/<name>/
├── src/
│   └── index.ts       # Main export
├── __tests__/         # vitest tests (and .spec-d.ts type tests where applicable)
├── package.json
├── README.md
├── LICENSE
└── CHANGELOG.md
```

## Project Structure

```text
mptool/
├── packages/           # All packages
│   ├── all/            # Full bundle
│   ├── api/            # Common API
│   ├── enhance/        # Communication framework
│   ├── encoder/        # Encoding support
│   ├── file/           # File & storage
│   ├── mock/           # wx API mock
│   ├── net/            # Network API
│   ├── parser/         # HTML parser
│   ├── shared/         # Shared utilities
│   ├── skyline/        # WeChat 3.0 bundle
│   └── skyline-enhance/ # WeChat 3.0 enhance
├── scripts/            # Build/dev tooling
│   ├── buffer.ts       # Buffer polyfill config
│   ├── copy.ts         # File copy helpers
│   ├── copy-package.ts # Copy @mptool/all to demo/node_modules
│   ├── sync-enhance.ts # Copy shared enhance files to skyline-enhance
│   ├── sync.ts         # Release sync
│   └── tsdown.ts       # Shared tsdown config
├── demo/               # Demo mini-app (depends on @mptool/all)
├── docs/               # VuePress documentation
├── lerna.json          # @lerna-lite configuration
├── oxlint.config.ts    # oxlint rules
└── oxfmt.config.ts     # oxfmt rules
```

## Key Concepts

### @mptool/enhance

Enhanced lifecycle framework providing:

- **$App**: App wrapper with `onAwake` lifecycle
- **$Page**: Page wrapper with `onAppLaunch`, `onNavigate`, `onPreload`, `onAwake` lifecycles
- **$Component**: Component wrapper with ref support and `$call` method
- **$bindGo** etc.: Tap-through navigation proxies with before/after hooks
- **emitter**: Global event emitter for cross-component communication
- **$Config**: Global configuration (with `maxDelay`/`minInterval` navigation options)

### @mptool/file

File and storage utilities:

- `file`: File operations (read, write, mkdir, rm, ls, unzip, saveFile, saveOnlineFile)
- `storage`: Expiring storage (put, take, get, set with expiration)

### @mptool/net

Network framework:

- `request`: Fetch-like API with Cookie management
- `createRequest`: Factory for creating request instances (with handlers)
- `Headers`, `URLSearchParams`: Standard web API implementations
- `Cookie`, `CookieStore`: Cookie management (RFC 6265 path matching)

### @mptool/parser

HTML parsing utilities:

- `getText`: Extract text from HTML
- `getRichTextNodes`: Parse HTML to rich-text nodes (incl. SVG → data URI conversion)

### @mptool/api

Common API utilities:

- `clipboard`: writeClipboard
- `contact`: addContact, getCurrentPage, getCurrentRoute
- `compareVersion`: Version comparison
- `media`: openDocument, saveDocument, savePhoto
- `network`: download, reportNetworkStatus
- `ui`: showModal, showToast, confirm, retry, getWindowInfo
- `update`: updateApp

### @mptool/mock

wx API mock for testing:

- `storage`: in-memory storage (sync/async, getStorageInfo with 10MB limit)
- `fileSystem`: singleton in-memory file system (ENOENT/EEXIST on missing/existing paths)
- `network`: request/downloadFile mock
- `ui`: toast/modal/setting/wifi/clipboard/media/update-manager mock
- `device`: device APIs (getSystemInfo etc.)
- `framework`: Page/App/Component/Behavior registration + navigation mocks

## Testing

- Framework: vitest 4 with istanbul coverage (`pnpm test` runs with coverage)
- Coverage target: `packages/*/src/**` — `@mptool/parser` and `@mptool/shared` are at 100% statement coverage; `@mptool/file`/`@mptool/net` at ~99% (remaining branches require non-wx environments, e.g. `env === "js"`/`"qq"` checks)
- Cross-package tests resolve `@mptool/mock` to its **dist**, so mock source changes require `pnpm --filter @mptool/mock build` first
- Test files are shuffle-safe (each case uses isolated state/independent overrides)

## Common Tasks

### Adding a new package

1. Create package in `packages/<name>/`
2. Add to `lerna.json` packages list if needed
3. Update `packages/all` exports if it's part of the bundle
4. Add documentation in `docs/`

### Fixing a bug

1. Write a failing test first
2. Fix the code
3. Ensure test passes
4. Check for side effects in dependent packages

### Adding a feature

1. Check if feature belongs in existing package or new one
2. Follow the package structure convention
3. Update exports in package `index.ts`
4. Document in `docs/` folder

### File Locations

- **Core enhance logic**: `packages/enhance/src/`
  - `app/` - App wrapper ($App)
  - `page/` - Page wrapper ($Page)
  - `component/` - Component wrapper ($Component)
  - `emitter/` - Event emitter system
  - `bridge.ts` - Navigation and mounting logic
  - `navigator/` - Navigation triggers with lock

- **Network**: `packages/net/src/`
  - `cookie.ts` - Cookie class
  - `cookieStore.ts` - CookieStore class
  - `request.ts` - Request function
  - `headers.ts` - Headers implementation

- **File/Storage**: `packages/file/src/`
  - `file.ts` - File operations
  - `storage.ts` - Expiring storage

- **Parser**: `packages/parser/src/`
  - `parser.ts` - HTML parsing logic
  - `richText.ts` - Rich-text node conversion

### Dependencies Note

- `miniprogram-api-typings` is a peer dependency for most packages
- `@mptool/mock` is only for development/testing
- Do not introduce circular dependencies between packages
- Workspace packages are bundled inline at build time (single-file dist)
