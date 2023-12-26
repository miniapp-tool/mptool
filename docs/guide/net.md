---
title: "@mptool/net"
icon: network-wired
---

::: tip

小程序网络框架，大小仅 12.02kb。

:::

## Fetch 与 fetch

框架提供了 `Fetch` 工厂和全局 `fetch` 方法，同时补齐了常用的 `Headers` 和 `URLSearchParams`。

`Fetch` 是一个工厂函数，它会返回一个 `fetch` 方法，你可以提供如下选项来控制默认行为，这些选项会被应用到每次请求中 (除非你在请求时覆盖):

- `server`: 访问的默认域名
- `redirect`: 默认重定向策略，支持 `follow` 和 `manual`，默认为 `follow`
- `enableCache`: 开启 cache
- `enableChunked`: 开启 transfer-encoding chunked。
- `enableHttp2`: 开启 http2
- `enableHttpDNS`: 是否开启 HttpDNS 服务。如开启，需要同时填入 httpDNSServiceId 。 HttpDNS 用法详见 [移动解析HttpDNS](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/HTTPDNS.html)
- `httpDNSServiceId`: ttpDNS 服务商 Id。 HttpDNS 用法详见 [移动解析HttpDNS](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/HTTPDNS.html)
- `enableQuic`: 开启 quic
- `forceCellularNetwork`: 强制使用蜂窝网络发送请求
- `timeout`: 超时时间，单位为毫秒。默认值为 60000

默认的 `fetch` 和 `Fetch` 配置好的 `fetch` 支持两个参数，第一个参数为请求的地址，第二个参数为 `FetchOptions`，支持默认 `wx.request` 的全部选项。

在使用时，你应该避免使用 `url` `data` 和 `header` 选项。前者已经作为第一个参数提供，后两者的的替代选项是 `body` 和 `headers`。

`fetch` 会自动保存响应的 Cookie，并在请求时附加对应的 Cookie，同时完善了以下选项:

- `method` 额外支持小写的方法名
- `body` 额外支持 `URLSearchParams` 和 `null`
- `headers` 额外支持 `Headers` 实例与数组格式的 Headers
- 新增 `cookieScope` 控制附带的 Cookie 范围 (默认为 `url`)
- 新增 `cookieStore` 控制请求时读取和响应时写入的 CookieStore 实例 (默认为内置全局实例)

::: info

在微信基础库 `3.2.3` 版本及以上，你可以设置 `redirect: manual` 到每一个请求，这样状态码为 301 的请求会被原样保留而不是直接跳转，重定向请求下发的 Cookie 也可以被记录。

其他版本的基础库或者未设置 `redirect` 选项发出的请求，框架无法解析重定向响应中的 Cookie 。

:::

`fetch` 会返回一个 `Promise`，你可以通过 `then` 方法获取响应，或者通过 `catch` 方法捕获错误。

只要请求成功，无论响应状态码是多少，都会走 `.then` 逻辑，返回包含下列信息的对象:

- status: 数字形式的响应状态码
- headers: Headers 实例
- data: 响应数据

如果请求失败，会走 `.catch` 逻辑，返回下列信息的对象:

- errMsg: 错误信息
- errno: 错误码

## Cookie

框架提供了 `Cookie` 来保存 Cookie 数据，并提供 `CookieStore` 进行存储管理。

### CookieStore

#### 使用

可通过它新建一个 `CookieStore` 实例:

```ts
const cookieStore = new CookieStore(key);
```

其中 `key` 是可选的，不填会使用默认值。我们的建议是在 `app.js` 手动初始化一个全局实例并挂载到 `App` 对象上全局使用。

如果你的不同分包之间需要隔离，可在各分包内初始化。

::: caution 创建多个相同 key 的实例会引发问题

:::

`CookieStore` 实例提供了以下方法：

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
