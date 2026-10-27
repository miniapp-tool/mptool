---
title: $Config
order: 2
---

Global configurator. It must be placed in the app's main script and called before `$App`.

Registering `$Page` / `$Component` also depends on the global configuration: registering a page or component before calling `$Config` throws `MpError`.

Compared with `@mptool/enhance`, the Skyline version has no `onNavigate` lifecycle or navigation lock, so it **does not accept** the `maxDelay` / `minInterval` options (passing them is a type error).

## defaultPage

- Type: `string`
- Required: Yes (optional when `getPath` is used)

Default path pattern.

When the page path or short name you provide cannot be resolved through `pages`, this path is used as a fallback.

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

You can express the mapping from short names to paths directly as an object, for example:

```js
{
  main: "/pages/main/main",
  cart: "/pages/cart/cart",
  user: "/pages/user/user",
}
```

You can also use an array format. Array elements can take either of two forms:

- `[page short name, mini-program path]`
- `[page short name array, mini-program path pattern]` (the path pattern uses `$name` to mark the position of the page short name)

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
  main: "/pages/main/main",
  cart: "/pages/cart/cart",
  user: "/pages/user/user",
  search: "/shop/search/search",
  details: "/shop/details/details",
  order: "/shop/order/order",
  about: "/others/about/about",
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

Home page name (short name or path).

When the page stack cannot support a `$back` navigation, the framework calls `reLaunch` to this page.

## extendComponent

- Type: `(options: TrivialComponentOptions) => void`
- Required: No

Custom component extension. Runs before the framework applies its extensions and can mount instance methods on every component.

## injectComponent

- Type: `(options: TrivialComponentOptions) => void`
- Required: No

Custom component injection. Runs after the framework applies its extensions and before component registration, and only once, which means you can override framework methods.

## extendPage

- Type: `(name: string, options: TrivialPageOptions) => void`
- Required: No

Custom page extension, run before the framework applies its extensions.

## injectPage

- Type: `(name: string, options: TrivialPageOptions) => void`
- Required: No

Custom page injection. Runs after the framework applies its extensions, which means you can override framework methods.

## hotReloadPattern

- Type: `string`
- Required: No

Page hot-reload code address template; `$name` is replaced with the page name.

When enabled, the framework checks for `createFunction`, mounted on `globalThis` by `installGlobal()` from `@mptool/run`, when a page registers; if it exists, the framework asynchronously fetches and executes the code at the address, then merges the returned methods object (whose properties are page methods) onto the page instance.

Hot reload is best-effort and does not block page registration or loading; fetch or execution failures are silently skipped.

@example `https://example.com/hotReloadCode/$name`

## hotReloadTimeout

- Type: `number`
- Default: `10000`

Timeout for page hot-reload fetches, in ms.

After the timeout, the page is treated as having no usable hot reload and waiting page instances are released, so page instances are not retained forever when a request never returns; responses that arrive after the timeout are ignored.
