---
title: "@mptool/enhance"
icon: toolbox
---

小程序增强框架，大小仅 8.59kB。

跨组件、页面通信，页面组件间引用，生命周期扩展和 TypeScript 支持。

## 使用

框架要求你使用 `@mptool/enhance` 导出的 `$App`，`$Component` 和 `$Page` 进行应用、页面与组件注册。

## $Config

用于配置小程序框架，请在 `app.js` 中于 `$App` 之前调用。

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

### 路由配置

尽管你已在 `app.json` 中配置了小程序路由，但是小程序脚本中无法获取到这些信息。小程序页面被推入页面栈前，小程序 JS 端也无法读取当前页面的路径。所以你需要配置小程序路由才可以让框架正常的触发额外的生命周期。

我们提供了 `defaultRoute` 和 `routes` 两个选项来帮助你传递页面路由。

此外，框架引入了以下两个名词:

::: info 页面简称

页面简称应该是一个符合页面的单词或短语，不应包含 `/` 或空格。

每个页面均需配置一个页面简称来简单的表示该页面。

:::

::: info 路径模式

你可以使用路径模式来表达小程序页面简称与实际路径的对应关系。

你需要填写一个小程序路径表达式，并将页面名称出现的位置用 `$name` 替换。

比如当你给出 `/pages/$name/$name` 时:

- `main` 页面简称会对应到 `/pages/main/main` 路径
- `/pages/user/user` 路径会拥有页面简称 `user`。

:::

你需要在 `defaultRoute` 填入一个页面模式，它表示在 `routes` 缺失或无法解析的情况下，对页面简称和页面路径的对应关系。换而言之，这是一个回退选项。

当你具有特别简单的小程序结构并可以完全用 `defaultRoute` 表示时，你无需配置 `routes` 选项。但是当你具有复杂的小程序结构 (如分包) 时你可以通过两种方式配置 `routes` 选项:

- 你可以直接以对象形式表示简称到路径的映射。如:

  ```js
  {
    main: '/pages/main/main',
    cart: '/pages/cart/cart',
    user: '/pages/user/user',
  }
  ```

- 你也可以在页面复杂的情况下数组格式表示小程序路径映射，数组的元素有两种填写方式:

  - `[页面简称, 小程序路经]`

  - `[页面简称数组, 小程序路径模式]`

  如:

  ```js
  [
    [["main", "cart", "user"], "/pages/$name/$name"],
    [["search", "details", "order"], "/shop/$name/$name"],
    ["about", "/others/about/about"],
  ];
  ```

  等效于:

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

请注意无法解析的路径会回退到 `defaultRoute`。

另外，你可以设置 `home` 选项，以应对无页面可后退时，重定向到的主页面。

### 跳转配置

由于框架的 `onNavigate` 生命周期会造成跳转延时，你可以通过 `maxDelay` 控制框架延迟跳转的最大时长，单位为 ms，默认为 `200`。

同时为了防止快速跳转触发额外生命周期导致的一些潜在问题 (诸如影响首屏渲染)，默认情况下，你只能在当前页面 `onReady` 生命周期触发之后再经过 100ms，才能通过框架进行下一次跳转。使用 `onReady` + `延时` 是为了保证首屏渲染完成，避免同步的 onNavigate 周期阻塞小程序渲染。如果你需要一个更大或者更小的延迟值，请通过 `minInterval` 设置。

### 构造器扩展

你可以通过以下扩展方法为每个组件和页面注入实例方法或属性。

- `extendComponent(componentOptions)` 用于扩展组件
- `extendPage(pageOptions)` 用于扩展页面

- `injectComponent(componentOptions)` 用于为组件注入，在框架扩展之后执行，这意味着你可以覆盖框架注入的方法。
- `injectPage(pageOptions)` 用于为页面注入，在框架扩展之后执行，这意味着你可以覆盖框架注入的方法。

## $App

框架提供的应用注册器

### 生命周期扩展

我们提供了额外的 `onAwake` 生命周期。

- `onAwake(time: number)`: 在小程序从后台唤醒时调用

  参数 `time` 为本次切入后台的时间，单位 ms

### 属性扩展

- `$all`: [Emitter](#emitter) 实例属性

### 方法扩展

- `$on`, `$off`, `$emit`, `$emitAsync`: [Emitter](#emitter) 实例方法

## 组件和页面通用的跳转方法

我们提供了新的 `onNavigate` 生命周期，想要触发它，你必须使用下列 API 进行跳转。

::: warning

由于相对 url 的写法会和页面简称出现混淆，框架不支持相对路径跳转，请一律使用页面简称或绝对路径

:::

我们在逻辑层包装了四个方法:

- `$go(pageName: string): Promise<WechatMiniprogram.NavigateToSuccessCallbackResult>`: 导航到指定页面，是 `wx.navigateTo` 的封装

- `$redirect(pageName: string): Promise<WechatMiniprogram.GeneralCallbackResult>`: 重定向到指定页面, 即**替换页面，不产生历史**，是 `wx.redirectTo` 的封装

- `$switch(pageName: string): Promise<WechatMiniprogram.GeneralCallbackResult>`: 跳转到指定 tabBar 页面，并关闭其他所有非 tabBar 页面，是 `wx.switchTab` 的封装

- `$reLaunch(pageName: string): Promise<WechatMiniprogram.GeneralCallbackResult>`: 关闭所有页面，之后打开到应用内的某个页面，是 `wx.reLaunch` 的封装

在上述四个方法中，`pageName` 为页面简称，同时可以带上 `queryString`。

你也可以传入一个带有可选参数使用绝对路径的 `url`。

::: tip 示例

```js
this.$go("play?vid=xxx&cid=xxx");

this.$redirect("about?year=2021");

this.$switch("main?user=mrhope");

this.$launch("main?user=mrhope");
```

:::

::: warning

请注意由于 `wx.switchTab` 不支持参数，参数将只用于触发 `onNavigate`

:::

此外，我们还在视图层一侧提供了四个代理方法 `$bindGo`, `$bindRedirect`, `$bindSwitch` 和`$bindRelaunch`

你需要使用 data-set 来绑定跳转配置:

- `data-url` 跳转到的页面简称或绝对路径
- `data-before` 跳转前执行
- `data-after` 跳转后执行

::: tip 例子

```html
<button
  catch:tap="$bindRedirect"
  data-url="/pages/play"
  data-after="onClickAfter"
>
  click redirect
</button>
```

```html
<button catch:tap="$bindReLaunch" data-url="play" data-before="onClickBefore">
  click reLaunch
</button>
```

:::

我们还提供了 `$back(delta = 1)` ，是 `wx.navigateBack` 的简单封装，`delta` 为返回的层数，默认为`1`

## $Page

框架提供的页面注册器，结构为 `$Page(name, options)`。

第一个参数为页面简称，第二个参数为页面选项。

如:

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

### 生命周期扩展

- `onRegister()`: 在页面即将注册时调用

  ::: warning

  此时 this 上尚未挂载小程序原生方法

  :::

- `onAppLaunch(options: WechatMiniprogram.App.LaunchShowOption)`: 在 App.onLaunch 触发时调用

  参数 `options` 为 App 启动时的 `onLaunch` 参数

- `onAwake(time: number)`: 在小程序从后台唤醒时调用

  参数 `time` 为本次休眠时间，单位 ms

- `onPreload(options: PageQuery)`: 预加载

  参数 `options` 为 url 参数对象

  可在其他页面中使用 `this.$preload(pageNameWithArgs|pageUrl)` 触发特定页面的预加载周期。

  你可以在用户特定行为后根据用户行为漏斗特点预加载对应界面准备数据。

  例子:

  ::: code-tabs

  @tab 商品详情页 (TS)

  ```ts
  // pages/detail/detail.ts
  import { $Page } from "@mptool/enhance";

  $Page("detail", {
    // ...

    // 用户在商品页面加入了购物车，极有可能下单
    addCart(itemID: string) {
      // ...
      this.$preload(`order?id=${itemID}`); // 通知订单页预加载此商品
    },
  });
  ```

  @tab 订单页 (TS)

  ```ts
  // pages/order/order.ts
  import { $Page } from "@mptool/enhance";

  $Page("order", {
    data: {
      loading: true,
    },

    onPreload({ id }: { id: string }) {
      // 此处 getData 可以为你自己的耗时逻辑
      getData(id).then((data) => {
        this.$state.id = id;
        this.$state.data = data;
      });
    },

    onLoad({ id }: { id: string }) {
      // 数据已经预加载
      if (this.$state.id === id) {
        // 直接设置，跳过加载
        this.setData({ loading: false, data });
      } else {
        // 自行获取
        getData(id).then((data) => {
          this.setData({ loading: false, data });
        });
      }
    },

    // ...
  });
  ```

  @tab 商品详情页 (JS)

  ```ts
  // pages/detail/detail.js
  const { $Page } = require("@mptool/enhance");

  $Page("detail", {
    // ...

    // 用户在商品页面加入了购物车，极有可能下单
    addCart(itemID) {
      // ...
      this.$preload(`order?id=${itemID}`); // 通知订单页预加载此商品
    },
  });
  ```

  @tab 订单页 (JS)

  ```ts
  // pages/order/order.js
  const { $Page } = require("@mptool/enhance");

  $Page("order", {
    data: {
      loading: true,
    },

    onPreload({ id }) {
      // 此处 getData 可以为你自己的耗时逻辑
      getData(id).then((data) => {
        this.$state.id = id;
        this.$state.data = data;
      });
    },

    onLoad({ id }) {
      // 数据已经预加载
      if (this.$state.id === id) {
        // 直接设置，跳过加载
        this.setData({ loading: false, data });
      } else {
        // 自行获取
        getData(id).then((data) => {
          this.setData({ loading: false, data });
        });
      }
    },

    // ...
  });
  ```

  :::

  ::: warning 小程序分包

  由于小程序每个分包下页面会在首次请求跳转到某个分包页面时注册，所以此时进入的首个页面无法触发 `onPreload` 周期。

  :::

- `onNavigate(options: PageQuery)`: 页面即将被跳转时触发

  为触发 `onNavigate` 生命周期，跳转必须使用[框架包装的方法](#组件和页面通用的跳转方法)

  参数 `options` 为 url 参数对象

  使用包装方法进行跳转时吗，会先执行对应页面的 `onNavigate` 再进行跳转。

  ::: warning

  由于同步或异步的 `onNavigate` 均受到支持，为了避免执行时间较长的方法阻塞跳转、迷惑用户，在达到 `maxDelay` 时长后框架会强制进行跳转，而不再等待 `onNavigate` 完成。

  另外由于小程序每个分包下页面会在首次请求跳转到某个分包页面时注册，所以此时进入的首个页面无法触发 `onNavigate` 周期。

  :::

  建议将低耗时 (< 150ms) 的操作放入 `onNavigate` 周期，并在 `onLoad` 时判断 `onNavigate` 是否成功触发。

  例子:

  ::: code-tabs

  @tab 商品详情页 (TS)

  ```ts
  // pages/detail/detail.ts
  import { $Page } from "@mptool/enhance";

  $Page("detail", {
    // ...

    // 用户在商品页面加入了购物车，极有可能下单
    addCart(itemID: string) {
      // ...
      this.$go(`order?id=${itemID}`); // 跳转到订单页
    },
  });
  ```

  @tab 订单页 (TS)

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
      // 数据已经处理完毕
      if (this.$state.id === id) {
        // 直接设置，跳过加载
        this.setData({ loading: false, orderData });
      } else {
        // 处理后赋值
        this.setData({
          loading: false,
          orderData: prepareOrderData(id),
        });
      }
    },

    // ...
  });
  ```

  @tab 商品详情页 (JS)

  ```ts
  // pages/detail/detail.js
  const { $Page } = require("@mptool/enhance");

  $Page("detail", {
    // ...

    // 用户在商品页面加入了购物车，极有可能下单
    addCart(itemID) {
      // ...
      this.$go(`order?id=${itemID}`); // 跳转到订单页
    },
  });
  ```

  @tab 订单页 (JS)

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
      // 数据已经处理完毕
      if (this.$state.id === id) {
        // 直接设置，跳过加载
        this.setData({ loading: false, orderData });
      } else {
        // 处理后赋值
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

### 属性扩展

- `$name`: 当前页面名称

- `$state`: 框架生成的页面状态

  ::: tip

  你可以考虑将部分自定义扩展的数据注入到此处

  :::

  - `$state.firstOpen`: 是否是第一个打开的页面

- `$refs`: 指定了 `ref` 的子组件实例映射

  示例:

  ```html
  <custom-component1 binding="$" ref="customComp1" />
  <custom-component2 binding="$" ref="customComp2" />
  ```

  ```js
  $Page({
    onLoad() {
      this.$refs.customComp1; // custom-component1 子组件的实例引用
      this.$refs.customComp2; // custom-component2 子组件的实例引用
    },
  });
  ```

- `$all`: [Emitter](#emitter) 实例属性

### 方法扩展

- `$preload(pageName: string)`: 提前预加载指定页面，即触发对应页面的 `onPreload` 生命周期

  `pageName` 为页面简称，可以带上 `queryString`，也可填入带有可选参数的小程序绝对路径

- `$currentPage(): PageInstance`: 获取当前页面实例

- `$getName(url: string): string`: 获取传入页面地址的页面简称

- `$getPath(name: string): string`: 获取传入页面简称的页面路径

- `$on`, `$off`, `$emit`, `$emitAsync`: [Emitter](#emitter) 实例方法

- `$`: 父子组件沟通器

  用于通过 `binding="$"` 形式建立父子组件/页面与组件沟通

  ::: tip

  我们这里做了一个优雅的 hack，实际上 `binding` 可以理解为 `bind:ing`，即框架向所有组件注入了 `ing` 事件并在内部调用它。

  :::

## $Component

框架提供的组件注册器。

### 属性扩展

- `$id`: 数字，当前组件的唯一标识

- `$refID`: 字符串，当前组件上用于索引的 ref ID 值

- `$root`: 当前组件所属的页面实例

  ::: warning

  只在 `attached`, `ready` 生命周期后生效

  :::

- `$parent`: 当前组件所属的父组件或父页面实例

  ::: warning

  只在 `attached`, `ready` 生命周期后生效

  :::

- `$refs`: 指定了 ref 的子组件实例 Map，在父组件获取子组件引用

  示例:

  ```html
  <custom-component binding="$" ref="customRef1" />
  ```

  ```js
  $Component({
    lifetimes: {
      attached() {
        this.$refs.customComp; // 根据ref属性获取子组件的实例引用
      },
    },
  });
  ```

- `$all`: [Emitter](#emitter) 实例属性

### 实例方法

- `$call(method: string, ...args: unknown[]): void`: 通过消息的方式调用父组件方法，即使父组件方法不存在也不会报错

  - 参数 `method` 为需要调用的方法名称
  - 参数 `args` 为需要传递的参数

- `$on`, `$off`, `$emit`, `$emitAsync`: [Emitter](#emitter) 实例方法

- `$`: 父子组件沟通器

  用于通过 `binding="$"` 形式建立父子组件/页面与组件沟通

  ::: tip

  我们这里做了一个优雅的 hack，实际上 `binding` 可以理解为 `bind:ing`，即框架向所有组件注入了 `ing` 事件并在内部调用它。

  :::

## Emitter

`Emitter` 是一个很常规的发布订阅器。

我们在 [mitt](https://github.com/developit/mitt) 之上提供了新的 `emitAsync` 方法加入了对 async 函数的支持，可以异步的触发所有的监听器之后触发自身的回调。

### 使用案例

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

具体详情请见 [API 文档](../api/enhance/emitter.md)
