# @mptool/enhance

::: tip

小程序增强框架，大小仅 6.56kB，同时支持 TS。

目前支持跨组件、页面通信，页面组件间引用和生命周期扩展

后续将支持 JS 解析与热更新。

:::

## 介绍

你需要使用 `@mptool/enhance` 导出的 `$App`，`$Component` 和 `$Page` 进行应用、页面与组件注册。

## $Config

用于配置小程序框架，请在 `app.js` 中于 `$App` 之前调用。

:::: code-group

::: code-group-item TypeScript

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

:::

::: code-group-item JavaScript

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

::::

### 路由配置

由于小程序 JS 端没有读取 app.json 中配置路由的能力，小程序页面被推入页面栈前，小程序 JS 端也无法读取当前页面的路径，所以你需要配置小程序路由才可以让框架正常的工作。

我们提供了 `defaultRoute` 和 `routes` 两个选项来帮助你传递页面路由。

此外，框架引入了以下两个名词:

::: tip 页面简称

为了能够很方便的表示其他页面，你需要为每个页面配置一个页面简称。

页面简称应该是一个符合页面的单词或短语，不应包含 `/` 或空格

:::

::: tip 路径模式

你可以使用路径模式来表达小程序页面简称与实际路径的对应关系。

你需要填写一个小程序路径表达式，并将页面名称出现的位置用 `$name` 替换。

比如当你给出 `/pages/$name/$name` 时，框架会将 `main` 页面简称会对应到 `/pages/main/main` 路径，同时将 `/pages/user/user` 路径的页面简称解析为 `user`。

:::

你需要在 `defaultRoute` 填入一个页面模式，它表示在 `routes` 缺失或无法解析的情况下，对页面简称和页面路径的对应关系。换而言之，这是一个默认回退的选项。

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

### 跳转配置

由于框架的 `onNavigate` 生命周期会造成跳转延时，你可以通过 `maxDelay` 控制框架延迟跳转的最大时长，单位为 ms，默认为 `200`。

同时为了防止快速跳转触发额外生命周期导致的一些潜在问题 (诸如影响首屏渲染)，默认情况下，你只能在当前页面 `onReady` 生命周期触发之后再经过 100ms，才能通过框架进行下一次跳转。使用 `onReady` + `延时` 是为了保证首屏渲染完成，避免同步的 onNavigate 周期阻塞小程序渲染。如果你需要一个更大或者更小的延迟值，请通过 `minInterval` 设置。

### 构造器扩展

你可以通过以下扩展方法为每个组件和页面注入实例方法或属性。

- `extendComponent(componentOptions)` 用于扩展组件
- `extendPage(pageOptions)` 用于扩展页面

- `injectPage(componentOptions)` 用于为组件注入，在框架扩展之后执行，这意味着你可以覆盖框架注入的方法。
- `injectPage(pageOptions)` 用于为页面注入，在框架扩展之后执行，这意味着你可以覆盖框架注入的方法。

## $App

框架提供的应用注册器

### 属性扩展

- `$emitter`: 事件派发器，是一个 [mitt](https://github.com/developit/mitt) 实例

### 生命周期扩展

- `onAwake(time: number)`: 在小程序从后台唤醒时调用

  参数 `time` 为本次切入后台的时间，单位 ms

## 组件和页面通用的跳转方法

::: warning

由于相对 url 的写法和夜间简称可能出现相同格式，框架不支持相对路径跳转，请一律使用页面简称或绝对路径

:::

- `$go(pagename: string): Promise<WechatMiniprogram.NavigateToSuccessCallbackResult>`: 导航到指定页面

  本函数是 `wx.navigateTo` 的封装，`pagename` 可以带上 `queryString`

  示例：

  ```js
  this.$go("play?vid=xxx&cid=xxx");
  ```

- `$redirect(pagename: string): Promise<WechatMiniprogram.GeneralCallbackResult>`: 重定向到指定页面, 即**替换页面，不产生历史**

  本函数是 `wx.redirectTo` 的封装，`pagename` 可以带上 `queryString`

  示例：

  ```js
  this.$redirect("about?year=2021");
  ```

- `$switch(pagename: string): Promise<WechatMiniprogram.GeneralCallbackResult>`: 跳转到指定 tabBar 页面，并关闭其他所有非 tabBar 页面

  本函数是 `wx.switchTab` 的封装，路径参数只用于触发 `onNavigate` (`wx.switchTab` 不支持参数)

  示例：

  ```js
  this.$switch("main?user=mrhope");
  ```

- `$reLaunch(pagename: string): Promise<WechatMiniprogram.GeneralCallbackResult>`: 关闭所有页面，之后打开到应用内的某个页面

  本函数是 `wx.reLaunch` 的封装，`pagename` 可以带上 `queryString`

  示例：

  ```js
  this.$launch("main?user=mrhope");
  ```

- `$back(delta = 1)`: 返回上一页

  本函数是 `wx.navigateBack` 的简单封装，delta 为返回的层数，默认为`1`

- `$preload(pagename: string)`: 提前预加载指定页面，即触发对应页面的 `onPreload` 生命周期

  本函数是 `wx.navigateBack` 的简单封装，delta 为返回的层数，默认为`1`

- 代理方法:

  `$bindGo`, `$bindRedirect`, `$bindSwitch` 和`$bindRelaunch` 是四个用在 WXML 的代理方法。

  你需要使用 data-set 来绑定跳转配置

  - `data-url` 跳转到的页面名
  - `data-before` 跳转前执行
  - `data-after` 跳转后执行

  例子:

  ```html
  <button
    bindtap="$bindRedirect"
    data-url="/pages/play"
    data-after="onClickAfter"
  >
    click redirect
  </button>
  ```

  ```html
  <button
    bindtap="$bindReLaunch"
    data-url="/pages/play"
    data-before="onClickBefore"
  >
    click reLaunch
  </button>
  ```

## $Page

框架提供的页面注册器，结构为 `$Page(name, options)`。

第一个参数为页面简称，第二个参数为页面选项。

如:

:::: code-group

::: code-group-item TypeScript

```ts
// pages/index/index.ts
import { $Page } from "@mptool/enhance";

$Page("main", {
  // your config here
});
```

:::

::: code-group-item JavaScript

```js
// pages/index/index.js
const { $Page } = require("@mptool/enhance");

$Page("main", {
  // your config here
});
```

:::

::::

### 属性扩展

- `$name`: 当前页面名称

- `$state`: 框架生成的页面状态

  ::: tip

  你可以考虑将部分自定义扩展的数据注入到此处

  :::

  - `$state.firstOpen`: 是否是第一个打开的页面

- `$emitter`: 事件派发器，是一个 [mitt](https://github.com/developit/mitt) 实例

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

### 方法扩展

- `$currentPage(): PageInstance`: 获取当前页面实例

- `$getName(url: string): string`: 获取传入页面地址的页面简称

- `$getPath(name: string): string`: 获取传入页面简称的页面路径

- `$`: 父子组件沟通器

  用于通过 `binding="$"` 形式建立父子组件/页面与组件沟通

  ::: tip

  我们这里做了一个优雅的 hack，实际上 `binding` 可以理解为 `bind:ing`，即框架向所有组件注入了 `ing` 事件并在内部调用它。

  :::

### 生命周期扩展

- `onRegister()`: 在页面即将注册时调用

  ::: warning

  此时页面的 this 还不可用

  :::

- `onAppLaunch(options: WechatMiniprogram.App.LaunchShowOption)`: 在 App.onLaunch 触发时调用

  参数 `options` 为 App 启动时的 `onLaunch` 参数

- `onAwake(time: number)`: 在小程序从后台唤醒时调用

  参数 `time` 为本次休眠时间，单位 ms

- `onPreload(options: PageQuery)`: 预加载

  参数 `options` 为 url 参数对象

  可在其他页面中使用 `this.$preload(pageNameWithArgs|pageUrl)` 触发特定页面的预加载周期。

  ::: warning 小程序分包

  由于小程序每个分包下页面会在首次请求跳转到某个分包页面时注册，所以此时进入的首个页面无法触发 `onPreload` 周期。

  :::

  你可以在用户特定行为后根据用户行为漏斗特点预加载对应界面准备数据。

  例子:

  :::: code-group

  ::: code-group-item 商品详情页 (TS)

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

  :::

  ::: code-group-item 订单页 (TS)

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

  :::

  ::: code-group-item 商品详情页 (JS)

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

  :::

  ::: code-group-item 订单页 (JS)

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

  ::::

- `onNavigate(options: PageQuery)`: 页面即将被跳转时触发

  为触发 `onNavigate` 生命周期，跳转必须使用框架包装的方法:

  - `$go`
  - `$redirect`
  - `$switch`
  - `$reLaunch`
  - `$bindGo`
  - `$bindRedirect`
  - `$bindSwitch`
  - `$bindReLaunch`

  参数 `options` 为 url 参数对象

  使用包装方法进行跳转时吗，会先执行对应页面的 `onNavigate` 再进行跳转。

  ::: warning

  由于同步或异步的 `onNavigate` 均受到支持，为了避免执行时间较长的方法阻塞跳转、迷惑用户，在达到 `maxDelay` 时长后框架会强制进行跳转，而不再等待 `onNavigate` 完成。

  另外由于小程序每个分包下页面会在首次请求跳转到某个分包页面时注册，所以此时进入的首个页面无法触发 `onNavigate` 周期。

  :::

  建议将低耗时 (< 150ms) 的操作放入 `onNavigate` 周期，并在 `onLoad` 时判断 `onNavigate` 是否成功触发。

  例子:

  :::: code-group

  ::: code-group-item 商品详情页 (TS)

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

  :::

  ::: code-group-item 订单页 (TS)

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

  :::

  ::: code-group-item 商品详情页 (JS)

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

  :::

  ::: code-group-item 订单页 (JS)

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

  ::::

## $Component

框架提供的组件注册器。

> TODO:　文档尚未制作完成

### 属性扩展

- `$id`: 数字，当前组件的唯一标识

- `$refID`: 字符串，当前组件引用的 ref id，

- `$root`: 当前组件所属的页面组件实例

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

### 实例方法

- `$call(method: string, ...args: unknown[]): void`: 通过消息的方式调用父组件方法，即使父组件方法不存在也不会报错

  - 参数 `method` 为需要调用的方法名称
  - 参数 `args` 为需要传递的参数

## $Emitter

> TODO:　文档尚未制作完成
