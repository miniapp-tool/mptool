---
title: "@mptool/skyline-enhance"
icon: toolbox
---

A slim version of `@mptool/enhance` for WeChat's [Skyline renderer](https://developers.weixin.qq.com/miniprogram/dev/framework/runtime/skyline/introduction.html) (base library 3.0+).

Cross-component and cross-page communication, page/component references, lifecycle extensions, and TypeScript support.

::: tip

Skyline rendering has runtime requirements: client 8.0.40+ (corresponding to base library 3.0.2+). When debugging in DevTools, switch the debug base library to 3.0.0+, and configure `"renderer": "skyline"` in `app.json` / `page.json`.

:::

## Differences from @mptool/enhance

| Capability                 | `@mptool/enhance`                                                     | `@mptool/skyline-enhance` |
| -------------------------- | --------------------------------------------------------------------- | ------------------------- |
| Additional lifecycles      | `onRegister` / `onAppLaunch` / `onNavigate` / `onPreload` / `onAwake` | `onRegister` / `onAwake`  |
| `$preload`                 | ✅                                                                    | ❌                        |
| Navigation lock            | ✅ (released after `onReady` + `minInterval`)                         | ❌                        |
| `maxDelay` / `minInterval` | Effective                                                             | ❌ (options removed)      |
| Route events               | `routeEmitter` + `onNavigate` / `onPreload`                           | ❌                        |

The reason: in Skyline mode, pages are registered on demand **when first navigated to** (rather than calling `Page()` at startup), so there is no `onPreload` lifecycle and no `$preload` instance method. The framework also has no page preparation cycle to await, so `onNavigate` and the navigation lock are removed as well.

Apart from the table above, `$Config`, `$App`, `$Page`, `$Component`, Emitter, and page hot reload are the same as in `@mptool/enhance`.

> If you need preload, pre-navigation preparation, or a navigation lock, use `@mptool/enhance`.

## Install

```bash
npm i @mptool/skyline-enhance
# also install the interpreter when using hot reload
npm i @mptool/run
```

## Usage

The framework requires you to register the app, pages, and components with `$App`, `$Component`, and `$Page` exported by `@mptool/skyline-enhance`.

### $Config

Configures the mini-program framework. Call it in `app.js` before `$App`.

::: code-tabs#language

@tab TypeScript

```ts
// app.ts
import { $App, $Config } from "@mptool/skyline-enhance";

$Config({
  // your config here
});

$App({
  // your app options here
});
```

@tab JavaScript

```js
// app.js
const { $App, $Config } = require("@mptool/skyline-enhance");

$Config({
  // your config here
});

$App({
  // your app options here
});
```

:::

`$Config`'s `defaultPage` / `pages` / `getPath` / `home` / `extendPage` / `injectPage` / `extendComponent` / `injectComponent` / `hotReloadPattern` are the same as in enhance. See the [$Config API](./api/config.md).

::: warning Options that only work in enhance

The Skyline version has no `onNavigate` or navigation lock, so `$Config` does not provide `maxDelay` / `minInterval`; passing either option is a type error.

:::

### $App

App registrar provided by the framework.

- Lifecycle extension: `onAwake(time: number)`, called when the mini-program is brought back from the background; `time` is the duration of this sleep, in ms
- Method extensions: `$on` / `$off` / `$emit` / `$emitAsync`

See the [$App API](./api/app.md).

### $Page

Page registrar provided by the framework, with the signature `$Page(name, options)`: `name` is the page short name and `options` are the page options.

```ts
// pages/index/index.ts
import { $Page } from "@mptool/skyline-enhance";

$Page("main", {
  // your config here
});
```

Additional lifecycles:

- `onRegister()`: called when the page is about to register (mini-program native methods are not yet mounted on `this`)
- `onAwake(time: number)`: called when the mini-program is brought back from the background while the page is alive

Properties and methods available on page instances (see the [$Page API](./api/page.md) for details):

- Properties: `$name`, `$state.firstOpen`, `$refs`
- Navigation: `$go` / `$redirect` / `$switch` / `$reLaunch` / `$back`
- Information: `$currentPage` (returns `undefined` when the page stack is empty) / `$getPath`
- Communication: `$` (parent-child component communicator), `$on` / `$off` / `$emit` / `$emitAsync`

::: warning Not provided by the Skyline version

- The `onAppLaunch` / `onNavigate` / `onPreload` lifecycles
- The `$preload` instance method

:::

### $Component

Component registrar provided by the framework, exactly the same as in enhance: typed `props`, parent/child references based on `$refs`, `$call(method, ...args)`, `$id` / `$refID` / `$root` / `$parent`, etc. See the [$Component API](./api/component.md).

## Navigation

The framework wraps four top-level navigation functions and the corresponding page instance methods:

- `go` / `$go`: wrapper around `wx.navigateTo`
- `redirect` / `$redirect`: wrapper around `wx.redirectTo` (replaces the page without creating history)
- `switchTab` / `$switch`: wrapper around `wx.switchTab`
- `reLaunch` / `$reLaunch`: wrapper around `wx.reLaunch`

```js
import { go } from "@mptool/skyline-enhance";

this.$go("play?vid=xxx&cid=xxx");
go("/pages/play?vid=xxx");
```

It also provides:

- `$back(delta = 1)`: a simple wrapper around `wx.navigateBack`; falls back to `home` from `$Config` when the page stack is insufficient
- View-layer proxies: `$bindGo` / `$bindRedirect` / `$bindSwitch` / `$bindRelaunch` / `$bindBack`, configured with `data-url`, `data-delta`, `data-before`, and `data-after`; `data-after` runs only when navigation actually succeeds

::: warning No navigation lock

The Skyline version does not maintain a navigation lock, so rapid successive navigations all execute. If your pages are at risk of repeated taps, add your own debounce or disable the button.

:::

::: warning `wx.switchTab` does not support parameters

As in enhance, `switchTab` uses only the path. The difference is that enhance uses the query to trigger `onNavigate`, while the Skyline version has no such lifecycle, so the query is ignored entirely.

:::

::: tip Relative paths

The framework does not support relative-path navigation. Always use a page short name or an absolute path.

:::

## Emitter

The framework exports `Emitter` and a global `emitter` instance for communication between any modules; the instance methods `$on` / `$off` / `$emit` / `$emitAsync` are mounted on `$App` / `$Page` / `$Component` instances.

```ts
import { Emitter, emitter } from "@mptool/skyline-enhance";

const bus = Emitter();

bus.on("foo", (payload) => console.log(payload));
bus.emit("foo", { a: "b" });
await bus.emitAsync("bar", { data: "content" });

// global instance
emitter.on("user-login", () => {});
```

See the [Emitter API](./api/emitter.md).

## Page hot reload

Page hot reload shares the same implementation as `@mptool/enhance`: after you set `$Config({ hotReloadPattern })`, the framework asynchronously fetches remote code and merges it onto the page instance when the page registers.

```ts
$Config({
  hotReloadPattern: "https://example.com/hotReloadCode/$name",
});
```

You must first mount `createFunction` in the mini-program's `app.js`:

```ts
import { installGlobal } from "@mptool/run";

installGlobal();
```

Fetch timing, the `onHotReload` hook, server deployment (returning a 200 with an empty body to avoid 404s), and other details are exactly the same as in enhance. See the [Page hot reload section in enhance](../enhance/README.md#page-hot-reload).

::: tip Concurrent registration, timeouts, and caching

- In-flight requests for the same page are deduplicated: a page module executing again does not fetch again;
- Fetches time out after 10 s by default; adjust this with `$Config({ hotReloadTimeout })`. After a timeout, waiting page instances are released;
- After deploying new code over the air (OTA), call `clearHotReloadCache()` / `clearHotReloadCache(name)` to clear the cache.

```ts
import { clearHotReloadCache } from "@mptool/skyline-enhance";

clearHotReloadCache("main");
```

:::

## Migrating from @mptool/enhance

Replace the package name with `@mptool/skyline-enhance`, then adjust according to this checklist:

1. Remove the `onAppLaunch` / `onNavigate` / `onPreload` lifecycles and `this.$preload(...)` calls;
2. Move pre-navigation preparation logic that depended on `onNavigate` into the target page's `onLoad` / `onRegister`;
3. Replace duplicate-navigation protection that depended on the navigation lock with debouncing at the call site;
4. Remove the `maxDelay` / `minInterval` configuration: Skyline has no `onNavigate` or navigation lock, and `$Config` no longer accepts these options;
5. Page hot reload, Emitter, `$Component`, `$refs`, and other usage are unchanged.

## API

- [Configuration ($Config)](./api/config.md)
- [App ($App)](./api/app.md)
- [Page ($Page)](./api/page.md)
- [Component ($Component)](./api/component.md)
- [Events (Emitter)](./api/emitter.md)
