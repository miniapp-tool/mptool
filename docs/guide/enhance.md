# @mptool/enhance

::: tip

小程序增强框架，大小仅 6.56kB。

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
  Page.P({
    onLoad: function () {
      this.$refs.customComp1; // custom-component1 子组件的实例引用
      this.$refs.customComp2; // custom-component2 子组件的实例引用
    },
  });
  ```

### 方法扩展

- `$`: 父子组件沟通器

  用于以 `binding="$"` 形式建立父子组件/页面与组件沟通

  ::: tip

  我们这里做了一个优雅的 hack，实际上 `binding` 可以理解为 `bind:ing`，即框架向所有组件注入了 `ing` 事件并在内部调用它。

  :::

### 生命周期扩展

- `onRegister()`: 在页面即将注册时调用

  ::: warning

  此时页面的 this 还不可用

  :::

- `onAwake(time: number)`: 在小程序从后台唤醒时调用

  参数 `time` 为本次休眠时间，单位 ms

- `onPreload(options: PageQuery)`: 预加载

  参数 `options` 为 url 参数对象

  可在其他页面中使用 `this.$preload(pageNameWithArgs|pageUrl)` 触发特定页面的预加载周期。

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

  你可以将低耗时 (建议 < 150ms) 的操作放入 `onNavigate` 周期。

  ::: tip

  请注意 `onNavigate` 周期会阻塞页面的跳转直至其完成。

  所以为了放置给用于如果你需要执行异步操作

  :::

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

> TODO:　文档尚未制作完成
