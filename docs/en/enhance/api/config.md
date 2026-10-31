---
title: $Config
order: 2
---

Global configurator. It must be placed in the app's main script and called before `$App`.

Registering `$Page` / `$Component` also depends on the global configuration: registering a page or component before calling `$Config` throws `MpError`.

## defaultPage

- Type: `string`
- Required: Yes

Default path pattern.

When the page path or short name you provide cannot be resolved through the route map, this path is used as a fallback.

Supply a mini-program path pattern: a path string in which `$name` marks the position of the page short name.

::: tip

You can use `/pages/$name/$name` to express:

- `main` → `/pages/main/main`
- `user` → `/pages/user/user`

:::

## pages

- Type: `Record<string, string> | Array<[string, string] | [string[], string]>`
- Required: No

Mapping between mini-program page short names and paths.

You can express the mapping directly as an object:

```js
{
  main: '/pages/main/main',
  cart: '/pages/cart/cart',
  user: '/pages/user/user',
}
```

When the page structure is complex, you can also use an array. Array elements can take either of two forms:

- `[page short name, mini-program path]`

- `[page short name array, mini-program path pattern]`

  A mini-program path pattern is a path string in which `$name` marks the position of the page short name.

For example:

```js
[
  [["main", "cart", "user"], "/pages/$name/$name"],
  [["search", "details", "order"], "/shop/$name/$name"],
  ["about", "/others/about/about"],
];
```

is equivalent to:

```js
{
  'main': '/pages/main/main',
  'cart': '/pages/cart/cart',
  'user': '/pages/user/user',
  'search': '/shop/search/search',
  'details': '/shop/details/details',
  'order': '/shop/order/order',
  'about': '/others/about/about',
}
```

::: tip

Paths that cannot be resolved fall back to `defaultPage`.

:::

## getPath

- Type: `(pageName: string) => string`
- Required: No

Custom resolver from page short name to page path, used as an alternative to `defaultPage` / `pages`. When `getPath` is configured, `defaultPage` can be omitted.

## home

- Type: `string`
- Required: No

Home page name.

## maxDelay

- Type: `number`
- Default: `200`

Maximum duration for which the framework delays a navigation, in ms.

## minInterval

- Type: `number`
- Default: `100`

Minimum interval after a page's initial render before another navigation is allowed, in ms.

## lockTimeout

- Type: `number`
- Default: `5000`

Maximum time the navigation lock is held, in ms.

Normally the navigation lock is released only after the target page's `onReady` (together with the `minInterval` delay); `onUnload` is not a release trigger, because with `redirectTo` / `reLaunch` / `switchTab` from a non-tab page the old page unloads before the target page is ready, and releasing there would let a later tap start a navigation while the target is still loading. If the target page never fires `onReady` (for example, `switchTab` returns to an already loaded tab page, or the page is forced back inside `onLoad`), the lock is force-released after `lockTimeout` so navigation cannot remain permanently blocked.

## hotReloadPattern

- Type: `string`

- Required: No

Page hot-reload code address template; `$name` is replaced with the page name.

When set, the framework asynchronously requests this address when a page **registers**, executes the returned code with `globalThis.createFunction` (`global: true`), and merges the returned methods object onto the page instance. Fetching happens only once, at registration, and never blocks page registration or loading; in-flight requests for the same page are deduplicated; fetch or execution failures are silently skipped. To get newly deployed code, restart the mini-program (or call `clearHotReloadCache()`).

```ts
$Config({
  hotReloadPattern: "https://example.com/hotReloadCode/$name",
});
```

::: tip

Hot-reload code requires `createFunction` to be mounted first by calling `installGlobal()` from `@mptool/run` in `app.js`; otherwise hot reload is skipped. See "Page hot reload" for details.

:::

## hotReloadTimeout

- Type: `number`
- Default: `10000`

Timeout for page hot-reload fetches, in ms.

After the timeout, the page is treated as having no usable hot reload and waiting page instances are released, so page instances (and their closures) are not retained forever when a request never returns; responses that arrive after the timeout are ignored.

## extendComponent

- Type: `(options: TrivialComponentOptions): void`

- Parameters:
  - `options`: component options

- Required: No

Custom component extension.

Runs before the framework applies its extensions and can mount instance methods on every component.

## injectComponent

- Type: `(options: TrivialComponentOptions): void`

- Parameters:
  - `options`: component options

- Required: No

Custom component injection.

Runs after the framework applies its extensions and before component registration, and only once, which means you can override framework methods.

## extendPage

- Type: `(name: string, options: TrivialPageOptions): void`

- Parameters:
  - `name`: page name
  - `options`: page options

- Required: No

Custom page extension, run before the framework applies its extensions.

## injectPage

- Type: `(name: string, options: TrivialPageOptions): void`

- Parameters:
  - `name`: page name
  - `options`: page options

- Required: No

Custom page injection.

Runs after the framework applies its extensions, which means you can override framework methods.
