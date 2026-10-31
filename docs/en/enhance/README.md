---
title: "@mptool/enhance"
icon: toolbox
---

A mini-program enhancement framework, only 8.59kB.

Cross-component and cross-page communication, page/component references, lifecycle extensions, and TypeScript support.

::: tip Using the Skyline renderer?

If you use WeChat's Skyline renderer (base library 3.0+), use the slim package [`@mptool/skyline-enhance`](/en/skyline-enhance/). It does not include the `onAppLaunch` / `onNavigate` / `onPreload` lifecycles or the `$preload` method, and navigation has no lock.

:::

## Usage

The framework requires you to register the app, pages, and components with `$App`, `$Component`, and `$Page` exported by `@mptool/enhance`.

## $Config

Configures the mini-program framework. Call it in `app.js` before `$App`.

::: code-tabs#language

@tab TypeScript

```ts
// app.ts
import { $App, $Config } from "@mptool/enhance";

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
const { $App, $Config } = require("@mptool/enhance");

$Config({
  // your config here
});

$App({
  // your app options here
});
```

:::

### Route configuration

Although you configure mini-program routes in `app.json`, that information is not available to mini-program scripts. Before a mini-program page is pushed onto the page stack, the JS side also cannot read the current page path. You therefore need to configure routes so the framework can trigger its additional lifecycles correctly.

We provide the `defaultPage` and `pages` options to help you supply page routes.

The framework also introduces the following two concepts:

::: info Page short name

A page short name should be a word or phrase that identifies the page, and must not contain `/` or spaces.

Every page needs a page short name so it can be referred to concisely.

:::

::: info Path pattern

Use a path pattern to describe how a mini-program page short name maps to an actual path.

Supply a mini-program path expression and replace the position of the page name with `$name`.

For example, when you provide `/pages/$name/$name`:

- the `main` page short name maps to the `/pages/main/main` path
- the `/pages/user/user` path has the page short name `user`.

:::

`defaultPage` takes a page pattern that defines the mapping between page short names and page paths when `pages` is missing or cannot be resolved. In other words, it is a fallback.

When your mini-program has a very simple structure that can be fully described by `defaultPage`, you do not need to configure `pages`. When your mini-program has a more complex structure (for example, with subpackages), you can configure `pages` in either of two ways:

- You can express the mapping from short names to paths directly as an object. For example:

  ```js
  {
    main: '/pages/main/main',
    cart: '/pages/cart/cart',
    user: '/pages/user/user',
  }
  ```

- When pages are complex, you can also express the mini-program path mapping as an array. Array elements can take either of two forms:
  - `[page short name, mini-program path]`

  - `[page short name array, mini-program path pattern]`

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

Note that paths that cannot be resolved fall back to `defaultPage`.

In addition, you can set the `home` option to choose the main page to redirect to when there is no page to go back to.

### Navigation configuration

Because the framework's `onNavigate` lifecycle delays navigation, you can use `maxDelay` to control the maximum duration of the delay, in ms. The default is `200`.

At the same time, to prevent rapid navigation from triggering extra lifecycles and causing potential issues (such as affecting the initial render), by default the next framework navigation can only happen 100 ms after the current page's `onReady` lifecycle fires. Using `onReady` + a delay ensures the initial render is complete and avoids synchronous `onNavigate` work blocking mini-program rendering. If you need a larger or smaller delay, set it with `minInterval`.

While the navigation lock is held, calls to `$go` / `$redirect` / `$switch` / `$reLaunch` are ignored: the returned Promise resolves to `undefined` (it does not reject, and no navigation occurs).

The navigation lock is held for at most 5000 ms by default and is then force-released (a fallback for when the target page never fires `onReady` / `onUnload`). You can adjust this duration with `lockTimeout`.

### Constructor extensions

You can inject instance methods or properties into every component and page with the following extension methods.

- `extendComponent(componentOptions)` extends components
- `extendPage(pageOptions)` extends pages

- `injectComponent(componentOptions)` injects into components after the framework's extensions and before component registration, which means you can override framework-injected methods.
- `injectPage(pageOptions)` injects into pages after the framework's extensions and before page registration, which means you can override framework-injected methods.

### Page hot reload

After you set `hotReloadPattern`, the framework automatically fetches and applies hot-reload code when a page registers; `$name` is replaced with the page name.

::: warning Fetch timing
Fetching happens only once when the page **registers** (when the page module executes), and it is not refreshed automatically afterward: entering a page that has already registered does not fetch again. To get newly deployed hot-reload code, **restart the mini-program** (restarting registers pages again and fetches once more).
:::

::: tip Concurrent registration, timeouts, and caching

- While a fetch request for the same page is in flight, duplicate registration (for example, when the page module executes twice) **does not send another request**;
- Fetches time out after 10 s by default; adjust this with `hotReloadTimeout`. After a timeout, the page is treated as having no usable hot reload and waiting page instances are released; late responses are ignored;
- After deploying new code over the air (OTA), call `clearHotReloadCache()` (all pages) or `clearHotReloadCache(name)` (a single page) to clear the cache, so pages fetch again when they register next time.

```ts
import { clearHotReloadCache } from "@mptool/enhance";

clearHotReloadCache(); // clear the hot-reload cache for all pages
clearHotReloadCache("main"); // clear only the main page
```

:::

```ts
$Config({
  hotReloadPattern: "https://example.com/hotReloadCode/$name",
});
```

Workflow:

1. When a page registers, the framework checks whether `createFunction` is mounted on `globalThis` (see "Mounting `createFunction`" below).
2. If it is mounted, the framework asynchronously requests the address in `hotReloadPattern` (without blocking page registration or loading).
3. It executes the returned code with `createFunction` and `global: true`, then merges the returned methods object onto the page instance.

```js
// Code returned by the server (function body)
return {
  onHotReload() {
    this.setData({ count: this.data.count + 1 });
  },
};
```

Hot reload is best-effort: fetch or execution failures are silently skipped. If hot reload is not ready when the page loads, the instance is recorded and patched after the fetch completes. The merged methods are called with the page instance as `this`, and can access `this.data`, `this.setData`, and page methods.

::: tip `onHotReload` is triggered automatically after hot reload is applied

The framework automatically triggers `onHotReload` from the methods object when hot reload is applied (with the page instance as `this`), which can be used to update page data automatically or run initialization logic:

- If the page has not finished rendering when hot reload is applied, `onHotReload` is triggered when the page fires `onReady` (after the first render completes);
- If the page has already passed `onReady` when hot reload is applied, it is triggered immediately.

:::

::: warning Other lifecycle methods are not executed

Mini-program lifecycle methods in the returned object, such as `onLoad`, `onShow`, and `onReady`, are not executed again: when hot reload is applied, those lifecycles have already been dispatched by the mini-program, and the framework only mounts the methods onto the page instance. Put logic that must run automatically in `onHotReload`.

:::

::: caution Mounting `createFunction` is required

Hot reload depends on `createFunction`. In a mini-program, `app.js` always runs first, so import `@mptool/run` in `app.js` and call `installGlobal()` (or set `globalThis.createFunction = createFunction` manually) before any page registers:

```ts
// app.js
import { installMptoolGlobals } from "@mptool/all"; // optional: expose api/file/net on globalThis.mptool
import { installGlobal } from "@mptool/run";

installGlobal();
installMptoolGlobals(); // optional
```

:::

::: tip Server deployment: avoid a large number of 404s

Every page registration requests the address in `hotReloadPattern`, but most pages do not have a hot-reload file. This produces many 404s and may affect WeChat's rating of network interface quality.

We recommend making the address always return 200: return the file contents when the file exists and an empty response body when it does not. In the `success` callback, the framework treats an empty response body as "this page has no hot-reload file" and silently skips it. Empty responses are not cached; after the mini-program restarts, pages register again and fetch again, so newly deployed files take effect.

```nginx
location /hot-reload/ {
    try_files $uri @empty200;  # exists → return the file contents; otherwise → empty response
    add_header Cache-Control "no-store" always;
}

location @empty200 {
    add_header Cache-Control "no-store" always; # prevent an empty 200 from being cached so newly deployed files take effect immediately
    return 200 "";
}
```

:::

## $App

App registrar provided by the framework.

### Lifecycle extensions

We provide an additional `onAwake` lifecycle.

- `onAwake(time: number)`: called when the mini-program is brought back from the background

  The `time` parameter is the duration of this sleep, in ms.

### Method extensions

- `$on`, `$off`, `$emit`, `$emitAsync`: [Emitter](#emitter) instance methods

## Navigation methods shared by components and pages

We provide a new `onNavigate` lifecycle. To trigger it, you must navigate with the following APIs.

::: warning

Because relative URLs can be confused with page short names, the framework does not support relative-path navigation. Always use a page short name or an absolute path.

:::

We wrap four methods at the logic layer:

- `$go(pageName: string): Promise<WechatMiniprogram.NavigateToSuccessCallbackResult>`: navigate to the specified page; wraps `wx.navigateTo`

- `$redirect(pageName: string): Promise<WechatMiniprogram.GeneralCallbackResult>`: redirect to the specified page, i.e. **replace the page without creating history**; wraps `wx.redirectTo`

- `$switch(pageName: string): Promise<WechatMiniprogram.GeneralCallbackResult>`: switch to the specified tabBar page and close all other non-tabBar pages; wraps `wx.switchTab`

- `$reLaunch(pageName: string): Promise<WechatMiniprogram.GeneralCallbackResult>`: close all pages, then open a page within the app; wraps `wx.reLaunch`

In all four methods, `pageName` is a page short name and may include a `queryString`.

You can also pass a `url` with an absolute path and optional parameters.

::: tip Example

```js
this.$go("play?vid=xxx&cid=xxx");

this.$redirect("about?year=2021");

this.$switch("main?user=mrhope");

this.$reLaunch("main?user=mrhope");
```

:::

::: warning

Note that because `wx.switchTab` does not support parameters, parameters are only used to trigger `onNavigate`.

:::

::: tip

The framework also exports the corresponding top-level functions `go`, `redirect`, `switchTab`, and `reLaunch`, which can be called directly without a page instance.

```js
import { go } from "@mptool/enhance";

go("play?vid=xxx");
```

:::

We also provide four view-layer proxy methods: `$bindGo`, `$bindRedirect`, `$bindSwitch`, and `$bindRelaunch`.

Use a data-set to bind navigation configuration:

- `data-url`: target page short name or absolute path
- `data-before`: executed before navigation
- `data-after`: executed after navigation

::: warning

`data-after` runs only when navigation actually happens (the `wx` navigation API returns successfully): it does not run when the navigation lock blocks the call (the Promise resolves to `undefined`) or when navigation fails. Navigation failures are caught and logged as errors, so no unhandled Promise rejection is produced.

:::

::: tip Example

```html
<button catch:tap="$bindRedirect" data-url="/pages/play" data-after="onClickAfter">
  click redirect
</button>
```

```html
<button catch:tap="$bindReLaunch" data-url="play" data-before="onClickBefore">
  click reLaunch
</button>
```

:::

We also provide `$back(delta = 1)`, a simple wrapper around `wx.navigateBack`. `delta` is the number of levels to go back and defaults to `1`.

## $Page

Page registrar provided by the framework, with the signature `$Page(name, options)`.

The first argument is a page short name and the second is the page options.

For example:

::: code-tabs#language

@tab code-group-item TypeScript

```ts
// pages/index/index.ts
import { $Page } from "@mptool/enhance";

$Page("main", {
  // your config here
});
```

@tab JavaScript

```js
// pages/index/index.js
const { $Page } = require("@mptool/enhance");

$Page("main", {
  // your config here
});
```

:::

### Lifecycle extensions

- `onRegister()`: called when the page is about to register

  ::: warning

  Mini-program native methods are not yet mounted on `this` at this point.

  :::

- `onAppLaunch(options: WechatMiniprogram.App.LaunchShowOption)`: called when `App.onLaunch` fires

  The `options` parameter is the `onLaunch` parameter from when the app started.

- `onAwake(time: number)`: called when the mini-program is brought back from the background

  The `time` parameter is the duration of this sleep, in ms.

- `onPreload(options: PageQuery)`: preload

  The `options` parameter is the URL parameter object.

  You can use `this.$preload(pageNameWithArgs|pageUrl)` in another page to trigger the preload lifecycle of a specific page.

  You can preload the corresponding screen and prepare data after a specific user action, based on the characteristics of the user behavior funnel.

  Example:

  ::: code-tabs

  @tab Product detail page (TS)

  ```ts
  // pages/detail/detail.ts
  import { $Page } from "@mptool/enhance";

  $Page("detail", {
    // ...

    // The user added the item to the cart on the product page and is very likely to order.
    addCart(itemID: string) {
      // ...
      this.$preload(`order?id=${itemID}`); // tell the order page to preload this item
    },
  });
  ```

  @tab Order page (TS)

  ```ts
  // pages/order/order.ts
  import { $Page } from "@mptool/enhance";

  $Page("order", {
    data: {
      loading: true,
    },

    onPreload({ id }: { id: string }) {
      // Prepare synchronously only: async results are not inherited by onLoad; fetch async data in onLoad.
      this.$state.id = id;
    },

    onLoad({ id }: { id: string }) {
      // $state written synchronously in onPreload has already been inherited by the instance.
      if (this.$state.id !== id) {
        // onPreload was not triggered: handle the fallback here.
      }

      // Fetch async data in onLoad and assign it directly to the instance.
      getData(id).then((data) => {
        this.setData({ loading: false, data });
      });
    },

    // ...
  });
  ```

  @tab Product detail page (JS)

  ```ts
  // pages/detail/detail.js
  const { $Page } = require("@mptool/enhance");

  $Page("detail", {
    // ...

    // The user added the item to the cart on the product page and is very likely to order.
    addCart(itemID) {
      // ...
      this.$preload(`order?id=${itemID}`); // tell the order page to preload this item
    },
  });
  ```

  @tab Order page (JS)

  ```ts
  // pages/order/order.js
  const { $Page } = require("@mptool/enhance");

  $Page("order", {
    data: {
      loading: true,
    },

    onPreload({ id }) {
      // Prepare synchronously only: async results are not inherited by onLoad; fetch async data in onLoad.
      this.$state.id = id;
    },

    onLoad({ id }) {
      // $state written synchronously in onPreload has already been inherited by the instance.
      if (this.$state.id !== id) {
        // onPreload was not triggered: handle the fallback here.
      }

      // Fetch async data in onLoad and assign it directly to the instance.
      getData(id).then((data) => {
        this.setData({ loading: false, data });
      });
    },

    // ...
  });
  ```

  :::

  ::: warning Mini-program subpackages

  Because pages in each mini-program subpackage are registered when the user first navigates to a page in that subpackage, the first page entered this way cannot trigger the `onPreload` lifecycle.

  :::

- `onNavigate(options: PageQuery)`: triggered when the page is about to be navigated to

  To trigger the `onNavigate` lifecycle, navigation must use the [methods wrapped by the framework](#navigation-methods-shared-by-components-and-pages).

  The `options` parameter is the URL parameter object.

  When navigating with the wrapped methods, the target page's `onNavigate` runs first, and then navigation occurs.

  ::: warning

  Because both synchronous and asynchronous `onNavigate` are supported, and to prevent long-running methods from blocking navigation and confusing users, the framework force-navigates once `maxDelay` is reached instead of waiting for `onNavigate` to finish.

  In addition, because pages in each mini-program subpackage are registered when the user first navigates to a page in that subpackage, the first page entered this way cannot trigger the `onNavigate` lifecycle.

  :::

  Put low-cost work (< 150 ms) in `onNavigate`, and check in `onLoad` whether `onNavigate` completed successfully.

  Example:

  ::: code-tabs

  @tab Product detail page (TS)

  ```ts
  // pages/detail/detail.ts
  import { $Page } from "@mptool/enhance";

  $Page("detail", {
    // ...

    // The user added the item to the cart on the product page and is very likely to order.
    addCart(itemID: string) {
      // ...
      this.$go(`order?id=${itemID}`); // navigate to the order page
    },
  });
  ```

  @tab Order page (TS)

  ```ts
  // pages/order/order.ts
  import { $Page } from "@mptool/enhance";

  $Page("order", {
    data: {
      loading: true,
    },

    onNavigate({ id }: { id: string }) {
      this.$state.orderData = prepareOrderData(id);
      this.$state.id = id;
    },

    onLoad({ id }: { id: string }) {
      // The data has already been prepared.
      if (this.$state.id === id) {
        // Set it directly and skip loading.
        this.setData({ loading: false, orderData });
      } else {
        // Prepare it, then assign.
        this.setData({
          loading: false,
          orderData: prepareOrderData(id),
        });
      }
    },

    // ...
  });
  ```

  @tab Product detail page (JS)

  ```ts
  // pages/detail/detail.js
  const { $Page } = require("@mptool/enhance");

  $Page("detail", {
    // ...

    // The user added the item to the cart on the product page and is very likely to order.
    addCart(itemID) {
      // ...
      this.$go(`order?id=${itemID}`); // navigate to the order page
    },
  });
  ```

  @tab Order page (JS)

  ```ts
  // pages/order/order.js
  const { $Page } = require("@mptool/enhance");

  $Page("order", {
    data: {
      loading: true,
    },

    onNavigate({ id }) {
      this.$state.orderData = prepareOrderData(id);
      this.$state.id = id;
    },

    onLoad({ id }) {
      // The data has already been prepared.
      if (this.$state.id === id) {
        // Set it directly and skip loading.
        this.setData({ loading: false, orderData });
      } else {
        // Prepare it, then assign.
        this.setData({
          loading: false,
          orderData: prepareOrderData(id),
        });
      }
    },

    // ...
  });
  ```

  :::

### Property extensions

- `$name`: current page name

- `$state`: page state generated by the framework, of type `PageState & Record<string, unknown>`

  ::: tip Independent per instance

  Each page instance receives its own `$state` at `onLoad` (initialized from the state in the page definition), so you can safely put business data there; multiple instances of the same page do not affect each other.

  Lifecycles that run before the instance is created (`onAppLaunch` / `onPreload` / `onNavigate`) use the page options object as `this`, and **synchronous** writes to `$state` there are inherited when the instance's `onLoad` runs.

  ::: warning Only synchronous writes are inherited
  Writes to `$state` in async callbacks such as `await` / `.then` / `setTimeout` happen after the instance is created and are **not** inherited by the instance's `$state`. Assign async data directly to the instance in `onLoad` (or a later lifecycle).
  :::

  :::
  - `$state.firstOpen`: whether this is the first opened page

- `$refs`: map of child component instances that have a `ref`

  Example:

  ```html
  <custom-component1 binding="$" ref="customComp1" />
  <custom-component2 binding="$" ref="customComp2" />
  ```

  ```js
  $Page("main", {
    onLoad() {
      this.$refs.get("customComp1"); // instance reference of the custom-component1 child
      this.$refs.get("customComp2"); // instance reference of the custom-component2 child
    },
  });
  ```

### Method extensions

- `$preload(pageName: string)`: preload the specified page in advance, i.e. trigger the corresponding page's `onPreload` lifecycle

  `pageName` is a page short name and may include a `queryString`; you can also provide a mini-program absolute path with optional parameters.

- `$currentPage(): PageInstance | undefined`: get the current page instance (returns `undefined` when the page stack is empty)

- `$getPath(name: string): string`: get the page path for the given page short name

- `$on`, `$off`, `$emit`, `$emitAsync`: [Emitter](#emitter) instance methods

- `$`: parent-child component communicator

  Establishes communication between parent and child components, or between pages and components, through `binding="$"`.

  ::: tip

  We use a neat hack here. In fact, `binding` can be understood as `bind:ing`: the framework injects an `ing` event into every component and calls it internally.

  :::

## $Component

Component registrar provided by the framework.

### Property extensions

- `$id`: number, the unique identifier of the current component

- `$refID`: string, the ref ID value used to index the current component

- `$root`: page instance that owns the current component

  ::: warning

  Only takes effect after the `attached` and `ready` lifecycles.

  :::

- `$parent`: parent component or parent page instance that owns the current component

  ::: warning

  Only takes effect after the `attached` and `ready` lifecycles.

  :::

- `$refs`: Map of child component instances that have a ref, used to access child component references from the parent component

  Example:

  ```html
  <custom-component binding="$" ref="customRef1" />
  ```

  ```js
  $Component({
    lifetimes: {
      attached() {
        this.$refs.get("customComp"); // get the child component instance by its ref attribute
      },
    },
  });
  ```

### Instance methods

- `$call(method: string, ...args: unknown[]): void`: call a parent component method through a message; no error is thrown even if the parent method does not exist
  - The `method` parameter is the name of the method to call.
  - The `args` parameter contains the arguments to pass.

- `$on`, `$off`, `$emit`, `$emitAsync`: [Emitter](#emitter) instance methods

- `$`: parent-child component communicator

  Establishes communication between parent and child components, or between pages and components, through `binding="$"`.

  ::: tip

  We use a neat hack here. In fact, `binding` can be understood as `bind:ing`: the framework injects an `ing` event into every component and calls it internally.

  :::

## Emitter

`Emitter` is a conventional publish/subscribe emitter. It additionally provides an `emitAsync` method with async function support, so all listeners can be triggered asynchronously before its own callback fires.

The framework also exports a global `emitter` instance that can be used for communication between any modules.

### Usage example

```ts
import { Emitter } from "@mptool/enhance";

const emitter = Emitter();

// listen to an event
emitter.on("foo", (e) => console.log("foo", e));

// listen to an event
emitter.on(
  "bar",
  (e) =>
    new Promise((resolve) =>
      setTimeout(() => {
        console.log("bar", e);
        resolve();
      }, 200),
    ),
);

// listen to all events
emitter.on("*", (type, e) => console.log(type, e));

// fire an event
emitter.emit("foo", { a: "b" });

// fire an event asynchronously
emitter.emitAsync("bar", { data: "content" }).then(() => {
  // now all handlers are complete
});

// clearing all events
emitter.all.clear();

// working with handler references:
function onFoo() {}
emitter.on("foo", onFoo); // start listening
emitter.off("foo", onFoo); // stop listening
```

For details, see the [API documentation](./api/emitter.md).
