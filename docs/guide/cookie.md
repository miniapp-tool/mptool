---
title: "@mptool/cookie"
icon: cookie
---

::: tip

小程序 Cookie 解析框架，大小仅 6.24kb。

:::

## CookieStore

### 初始化

调用此函数会创建一个 `CookieStore` 实例，有如下方法:

```ts
const cookieStore = new CookieStore(key);
```

其中 `key` 是可选的，不填会使用默认值。我们的建议是在 `app.js` 手动初始化一个全局实例并挂载到 `App` 对象上全局使用。

如果你的不同分包之间需要隔离，可在各分包内初始化。**不要创建多个相同 key 的实例**，这会引发问题！

### 方法

- `get(name, options)`: 获取 Cookie
- `getValue(name, options)`: 获取 Cookie 值
- `has(name, options)`: 是否有 Cookie
- `set(options)`: 设置 Cookie
- `list()`: 按 domain 结构获取全部 Cookie
- `getCookies(options)`: 获取满足条件的 Cookie
- `getAllCookies()`: 获取全部 Cookies
- `getCookiesMap(options)`: 获取满足条件的 Cookie 键值 Map
- `apply(cookies)`: 向存储中应用 Cookie
- `clear(domain?)`: 清除 `domain` 下的全部 cookie
- `applyHeader(header, domainOrURL)`: 应用 header 中的 cookies
- `applyResponse(response, domainOrURL)`: 应用 response 中的 cookies
- `getHeader(options)`: 获取 cookie header
