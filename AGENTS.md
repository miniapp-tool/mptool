# AGENTS.md

## Project Overview

**mptool** is a lightweight mini-program (小程序) enhancement framework for QQ/WeChat mini-apps.

- **Repository**: [miniapp-tool/mptool](https://github.com/miniapp-tool/mptool)
- **Author**: Mr.Hope (mister-hope@outlook.com)
- **Version**: 0.12.0
- **Package Manager**: pnpm

## Architecture

### Packages

| Package                   | Description                                               | Size    |
| ------------------------- | --------------------------------------------------------- | ------- |
| `@mptool/all`             | Full bundle (api, enhance, file, net, parser)             | -       |
| `@mptool/enhance`         | Communication framework with enhanced lifecycles          | < 10kb  |
| `@mptool/file`            | File and storage API with expiration support              | -       |
| `@mptool/net`             | Network API with Headers, URLSearchParams, Cookie support | 12.02kb |
| `@mptool/parser`          | HTML parser for rich-text                                 | 3.5kb   |
| `@mptool/encoder`         | GBK and GB2312 encoding support                           | -       |
| `@mptool/api`             | Common API utilities (media, network, ui)                 | -       |
| `@mptool/mock`            | wx API mock for testing                                   | -       |
| `@mptool/shared`          | Shared utilities (emitter, logger, etc.)                  | -       |
| `@mptool/skyline`         | Bundle for WeChat dist 3.0                                | -       |
| `@mptool/skyline-enhance` | Lifetime enhance for WeChat dist 3.0                      | -       |

### Dependency Graph

```
@mptool/all
├── @mptool/api
├── @mptool/enhance
├── @mptool/file
├── @mptool/net
└── @mptool/parser

@mptool/enhance
├── @mptool/mock (dev)
└── @mptool/shared

@mptool/file
├── @mptool/mock (dev)
└── @mptool/shared

@mptool/net
├── @mptool/shared
├── @mptool/mock (dev)
└── set-cookie-parser (dev)

@mptool/parser
├── @mptool/shared
├── @mptool/mock (dev)
├── cheerio
└── domhandler

@mptool/skyline
├── @mptool/file
├── @mptool/net
├── @mptool/parser
└── @mptool/skyline-enhance

@mptool/skyline-enhance
├── @mptool/mock (dev)
└── @mptool/shared
```

## Development Conventions

### Code Style

- Use **oxlint** for linting
- Use **tsdown** for building
- Use **vitest** for testing
- Use **Conventional Commits** for commit messages

### Build Commands

```sh
pnpm install        # Install dependencies
pnpm build          # Build all packages
pnpm build:all      # Build all packages
pnpm clean          # Clean dist files
pnpm test           # Run tests
pnpm test:ci        # Run tests in CI mode
pnpm lint           # Lint code
pnpm release        # Release (lerna version)
```

### Package Structure

Each package follows this structure:

```text
packages/<name>/
├── src/
│   └── index.ts       # Main export
├── package.json
├── README.md
├── LICENSE
└── CHANGELOG.md
```

### Key Technologies

- **TypeScript** for type safety
- **miniprogram-api-typings** v5.0.0 for WeChat API types
- **lerna** for monorepo management
- **VuePress** for documentation

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
├── demo/               # Demo mini-app
├── docs/               # VuePress documentation
└── lerna.json          # Lerna configuration
```

## Key Concepts

### @mptool/enhance

Enhanced lifecycle framework providing:

- **$App**: App wrapper with `onAwake` lifecycle
- **$Page**: Page wrapper with `onAppLaunch`, `onNavigate`, `onPreload`, `onAwake` lifecycles
- **$Component**: Component wrapper with ref support and `$call` method
- **emitter**: Global event emitter for cross-component communication
- **$Config**: Global configuration

### @mptool/file

File and storage utilities:

- `file`: File operations (read, write, mkdir, rm, ls, unzip)
- `storage`: Expiring storage (put, take, get, set with expiration)

### @mptool/net

Network framework:

- `request`: Fetch-like API with Cookie management
- `createRequest`: Factory for creating request instances
- `Headers`, `URLSearchParams`: Standard web API implementations
- `Cookie`, `CookieStore`: Cookie management

### @mptool/parser

HTML parsing utilities:

- `getText`: Extract text from HTML
- `getRichTextNodes`: Parse HTML to rich-text nodes

### @mptool/api

Common API utilities:

- `clipboard`: writeClipboard
- `contact`: addContact, getCurrentPage, getCurrentRoute
- `compareVersion`: Version comparison
- `media`: openDocument, saveDocument, savePhoto
- `network`: download, reportNetworkStatus
- `ui`: showModal, showToast, confirm, retry, getWindowInfo
- `update`: updateApp

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

- **Network**: `packages/net/src/`
  - `cookie.ts` - Cookie class
  - `request.ts` - Request function
  - `headers.ts` - Headers implementation

- **File/Storage**: `packages/file/src/`
  - `file.ts` - File operations
  - `storage.ts` - Expiring storage

- **Parser**: `packages/parser/src/`
  - `parser.ts` - HTML parsing logic

### Dependencies Note

- `miniprogram-api-typings` v5.0.0 is a peer dependency for most packages
- `@mptool/mock` is only for development/testing
- Do not introduce circular dependencies between packages
