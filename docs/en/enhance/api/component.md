---
title: $Component
order: 5
---

- Type: `$Component(options: ComponentOptions): string`

Component registrar provided by the framework.

::: warning Prerequisite

`$Component` depends on the global configuration: you must first call `$Config` in the mini-program entry (`app.js`), before `$App`; otherwise registering a component throws `MpError`.

:::

## Injected properties

### $id

- Type: `number`

Unique identifier of the current component.

### $refID

- Type: `string`

The ref ID value used to index the current component.

### $root

- Type: `PageInstance`

Page instance that owns the current component.

::: warning

Only takes effect after the `attached` and `ready` lifecycles.

:::

### $parent

- Type: `PageInstance | ComponentInstance`

Parent component or parent page instance that owns the current component.

::: warning

Only takes effect after the `attached` and `ready` lifecycles.

:::

### $refs

- Type: `Map<string, ComponentInstance>`

Map of child component instances that have a `ref`; can be used to access child component references.

::: tip Example

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

:::

### $call

- Type:

  ```ts
  function $call(method: string, ...args: unknown[]): void;
  ```

- Parameters:
  - `method`: name of the method to call
  - `args`: arguments to pass

Call a parent component method through a message; no error is thrown even if the parent method does not exist.

### $getRef

- Type:

  ```ts
  function $getRef(id: number): TrivialComponentInstance | undefined;
  ```

- Parameters:
  - `id`: unique component identifier (`$id`)

Get a component instance by its component ID.

### Event dispatch

The event dispatch members are all instance properties or methods of [$Emitter](/en/enhance/api/emitter/).

- `$on(type:string, handler: (event?:any) => void | Promise<void>): void`: listen for the `type` event

- `$emit(type:string, event?:any): void`: emit the `type` event synchronously

- `$emitAsync(type:string, event?:any): Promise<void>`: emit the `type` event asynchronously and accept a callback

- `$off(type:string, handler?: (event?:any) => void | Promise<void>): void`: remove the `handler` for `type`, or all handlers when `handler` is omitted

### $

Parent-child component communicator.

Provides the ability to establish communication between parent and child components, or between pages and components, through `binding="$"`.

### $preload

- Type:

  ```ts
  function $preload(pageName: string): void;
  ```

- Parameters:
  - `pageName`: page short name, optionally with a `queryString`

Preload the specified page in advance, which triggers its `onPreload` lifecycle. This method is synchronous and returns `void`.

### $go

- Type:

  ```ts
  function $go(pageName: string): Promise<WechatMiniprogram.NavigateToSuccessCallbackResult>;
  ```

- Parameters:
  - `pageName`: page short name, optionally with a `queryString`

Navigate to the specified page.

This function wraps `wx.navigateTo`.

::: tip Example

```js
this.$go("play?vid=xxx&cid=xxx");
```

:::

### $redirect

- Type:

  ```ts
  function $redirect(pageName: string): Promise<WechatMiniprogram.GeneralCallbackResult>;
  ```

- Parameters:
  - `pageName`: page short name, optionally with a `queryString`

Redirect to the specified page, i.e. **replace the page without creating history**.

This function wraps `wx.redirectTo`.

::: tip Example

```js
this.$redirect("about?year=2021");
```

:::

### $switch

- Type:

  ```ts
  function $switch(pageName: string): Promise<WechatMiniprogram.GeneralCallbackResult>;
  ```

- Parameters:
  - `pageName`: page short name, optionally with a `queryString`

Switch to the specified tabBar page and close all other non-tabBar pages.

This function wraps `wx.switchTab`.

::: warning

The path parameters are only used to trigger `onNavigate` (`wx.switchTab` does not support parameters).

:::

::: tip Example

```js
this.$switch("main?user=mrhope");
```

:::

### $reLaunch

- Type:

  ```ts
  function $reLaunch(pageName: string): Promise<WechatMiniprogram.GeneralCallbackResult>;
  ```

- Parameters:
  - `pageName`: page short name, optionally with a `queryString`

Close all pages, then open a page within the app.

This function wraps `wx.reLaunch`.

::: tip Example

```js
this.$reLaunch("main?user=mrhope");
```

:::

### $back

- Type:

  ```ts
  function $back(delta = 1): Promise<WechatMiniprogram.GeneralCallbackResult>;
  ```

- Parameters:
  - `delta`: number of levels to go back; defaults to `1`

This function is a simple wrapper around `wx.navigateBack`.

### $bindGo

View-layer proxy for `$go`. Use a dataset in the view layer to bind navigation configuration:

- `data-url`: target page short name or absolute path, optionally with parameters
- `data-before`: executed before navigation
- `data-after`: executed after navigation

::: tip

```html
<button catch:tap="$bindGo" data-url="play" data-before="onClickBefore">click go</button>
```

:::

### $bindRedirect

View-layer proxy for `$redirect`. Use a dataset in the view layer to bind navigation configuration:

- `data-url`: target page short name or absolute path, optionally with parameters
- `data-before`: executed before navigation
- `data-after`: executed after navigation

::: tip

```html
<button catch:tap="$bindRedirect" data-url="/pages/play" data-after="onClickAfter">
  click redirect
</button>
```

:::

### $bindSwitch

View-layer proxy for `$switch`. Use a dataset in the view layer to bind navigation configuration:

- `data-url`: target page short name or absolute path, optionally with parameters

  ::: warning

  Because `wx.switchTab()` does not support parameters, parameters are only used to trigger the target page's `onNavigate` lifecycle.

  :::

- `data-before`: executed before navigation
- `data-after`: executed after navigation

### $bindRelaunch

View-layer proxy for `$reLaunch`. Use a dataset in the view layer to bind navigation configuration:

- `data-url`: target page short name or absolute path, optionally with parameters
- `data-before`: executed before navigation
- `data-after`: executed after navigation

### $bindBack

View-layer proxy for `$back`. Use a dataset in the view layer to bind navigation configuration:

- `data-delta`: number of levels to go back
- `data-before`: executed before navigation
- `data-after`: executed after navigation
