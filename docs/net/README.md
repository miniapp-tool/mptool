---
title: "@mptool/net"
icon: network-wired
---

小程序网络框架，大小仅 12.02kb。

<!-- more -->

## request 与 createRequest

框架提供了 `createRequest` 工厂和全局 `request` 方法，同时补齐了常用的 `Headers` 和 `URLSearchParams`。

`createRequest` 是一个工厂函数，它会返回 `request` 方法和 `cookieStore`，并允许你通过如下选项控制默认行为，这些选项会被应用到每次请求中 (除非你在请求时覆盖):

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
- `retry`: 默认重试配置，结构见下方「取消、超时与重试」

默认的 `request` 和 `createRequest` 生成的 `request` 支持两个参数，第一个参数为请求的地址，第二个参数为 `RequestOptions`，支持 `wx.request` 的选项（`url` / `method` / `header` / `data` / `success` / `fail` 除外）。

在使用时，你应该避免使用 `url` `data` `header` 选项，也不应传入 `success` / `fail`。前者已经作为第一个参数提供，后两者的的替代选项是 `body` 和 `headers`；`success` / `fail` 由框架内部接管，用于 resolve / reject Promise 并写回响应中的 Cookie，即使运行时强行传入也会被覆盖。

`request` 会自动保存响应的 Cookie，并在请求时附加对应的 Cookie，同时完善了以下选项:

- `method` 额外支持小写的方法名
- `body` 额外支持 `URLSearchParams` 和 `null`
- `headers` 额外支持 `Headers` 实例与数组格式的 Headers
- 新增 `cookieScope` 控制附带的 Cookie 范围 (默认为 `url`)
- 新增 `cookieStore` 控制请求时读取和响应时写入的 CookieStore 实例 (默认为内置全局实例)

::: info

在微信基础库 `3.2.3` 版本及以上，你可以设置 `redirect: manual` 到每一个请求，这样状态码为 301 的请求会被原样保留而不是直接跳转，重定向请求下发的 Cookie 也可以被记录。

框架无法解析重定向响应中的 Cookie，所以其他版本的基础库或者未设置 `redirect` 选项发出的请求仍然受到限制。

:::

`request` 会返回一个 `Promise`，你可以通过 `then` 方法获取响应，或者通过 `catch` 方法捕获错误。

返回值是普通 `Promise`，额外挂载了取消能力：

- `abort()`: 取消本次请求（包括等待中的重试），幂等
- `task`: 当前尝试对应的底层 `RequestTask`

```ts
const req = request("/api/user");

req.abort(); // 取消请求
await req; // 仍然可以当作普通 Promise 使用
```

请求选项额外支持：

- `cancelKey`: 取消分组键，配合 `createRequest().abort(key)` 批量取消
- `onTask`: 拿到每次尝试的 `RequestTask`（进度 / headers 事件）
- `signal`: 取消信号，只需提供 `{ aborted: boolean }`（可选 `addEventListener`）
- `retry`: 本次请求的重试配置；`false` 关闭

### 取消、超时与重试

```ts
const api = createRequest({
  server: "https://example.com",
  timeout: 15000,
  retry: {
    attempts: 3, // 含第一次
    delay: 300,
    maxDelay: 3000,
    methods: ["GET", "HEAD"], // 默认只重试幂等方法
    statusCodes: [408, 429, 500, 502, 503, 504],
    rejectOnHttpError: false, // 默认保持「任何状态码都 resolve」
    onRetry: ({ attempt, delay, error }) => {},
  },
});

// 页面卸载时批量取消
api.request("/user", { cancelKey: "page:user" });
onUnload(() => api.abort("page:user")); // 或 api.abortAll()
```

- 未传 `timeout` 时沿用微信 `networkTimeout`（默认 60 秒），不会强加框架默认值；
- 默认不重试；重试只对 `methods` 内的方法生效，且 `abort` 会立即停止重试；
- 每次尝试都会重新计算 Cookie header；
- 失败统一为 `MpError`（`RequestError` 子类），额外提供 `type: "abort" | "timeout" | "network" | "http"` 便于区分；`responseHandler` / `errorHandler` 只在最终结果调用一次。

::: info

框架默认开启 `enableHttp2` 与 `useHighPerformanceMode`，如需关闭可在单个请求中传入对应选项覆盖。

:::

请求成功 (任何状态码) 会触发 `.then` 回调，返回包含下列信息的对象:

- status: 数字形式的响应状态码
- headers: Headers 实例
- data: 响应数据

如果请求失败 (基础库、底层或网络问题)，会走 `.catch` 逻辑，返回一个 `MpError` 错误。你可以通过 `message` 属性获取错误信息，或者通过 `code` 属性获取错误码。

## Cookie

框架提供了 `Cookie` 来存储/序列化 Cookie 数据。

Cookie 类有如下内容:

实例属性:

- `name: string`: Cookie 名称
- `value: string`: Cookie 值
- `domain: string`: Cookie 域名
- `path: string`: Cookie 路径
- `createdAt: number`: 创建时间（毫秒时间戳），用于 RFC 6265 的 Cookie 排序
- `expires: Date | "session" | "outdate"`: 过期时间
- `httpOnly: boolean`: 是否只在 HTTP 下使用

方法:

- `isExpired(): boolean`: 判断 Cookie 是否已过期

- `isPersistence(): boolean`: 判断 Cookie 是否可持久化

- `isDomainMatched(domain: string): boolean`: 判断 Cookie 是否匹配域名
  - `domain`: 域名

- `isPathMatched(path: string): boolean`: 判断 Cookie 是否匹配路径
  - `path`: 路径

- `toString(): string`: 将 Cookie 转换为字符串

- `toJSON(): CookieType`: 将 Cookie 序列化为对象

其中 CookieType 是序列化的 Cookie 对象类型，包含以下字段:

- `name`: Cookie 名称
- `value`: Cookie 值
- `path`: Cookie 路径
- `createdAt`: 创建时间（毫秒时间戳）
- `expires`: 过期时间 (Date 对象)
- `maxAge`: 最大存活时间 (秒)
- `domain`: Cookie 域名
- `secure`: 是否只在 HTTPS 下发送（小程序仅支持 HTTPS，真机始终可发送；仅在 `http://` 调试地址下跳过）
- `httpOnly`: 是否只在 HTTP 下使用
- `sameSite`: SameSite 属性（`lax` / `strict` / `none`），随 Cookie 持久化

其中 `name` 和 `value` 时必须的，其他项是可选的。

## CookieStore

框架提供 `CookieStore` 对 Cookie 进行存储。创建 `CookieStore` 实后，你可以在其中读取/写入 Cookie:

```ts
const cookieStore = new CookieStore(key);
```

其中 `key` 是可选的，不填会使用默认值。我们的建议是在 `app.js` 手动初始化一个全局实例并挂载到 `App` 对象上全局使用。如果你的不同分包之间需要隔离，可在各分包内初始化。

::: caution 创建多个相同 key 的实例会引发问题

:::

`CookieStore` 实例提供了以下方法：

- `get(name, options)`: 获取 Cookie
- `getValue(name, options)`: 获取 Cookie 值
- `has(name, options)`: 是否有 Cookie
- `set(options)`: 设置 Cookie
- `delete(name, domain?, path?)`: 删除指定 Cookie，省略 `path` 时删除该名称下所有路径的 Cookie
- `list()`: 按 domain 结构获取全部 Cookie
- `getCookies(options)`: 获取满足条件的 Cookie
- `getAllCookies()`: 获取全部 Cookies
- `getCookiesMap(options)`: 获取满足条件的 Cookie 键值 Map
- `apply(cookies)`: 向存储中应用 Cookie
- `clear(domain?, exact=false)`: 清除 `domain` 范围内（若 `exact` 为 `true` 则仅 `domain` 下）的全部 cookie，不填 domain 则清除全部 Cookies
- `applyHeader(header, domainOrURL)`: 应用 header 中的 cookies
- `applyResponse(response, domainOrURL)`: 应用 response 中的 cookies，其中 response 为 `wx.request` 的 `success` 回调对象
- `getHeader(options)`: 获取 cookie header

Cookie 以 `(name, domain, path)` 三元组存储，同名但路径不同的 Cookie 可以共存。`getCookies()` 按 RFC 6265 §5.4 排序：path 更长者优先，path 长度相同时创建时间更早者优先；`get()` / `getValue()` 返回排序后的第一条匹配项，`getHeader()` 也按相同顺序拼接同名 Cookie。

Storage 读写经过优化：首次读写时才会从 Storage 加载 Cookie（导入 `@mptool/net` 不会在启动阶段触发同步读取）；同一 microtask 内的多次 `set` / `delete` / `clear` / `apply` 会合并为一次 `wx.setStorageSync` 写入。为限制异常响应造成的膨胀，单条 Cookie 超过 4096 字节会被丢弃；单个域名最多保留 50 条、总量最多 3000 条（RFC 6265 §6.1 的最小容量建议），超出时淘汰创建时间最早的 Cookie。

其中 `options` 为可选参数，支持以下选项:

- 任意组合以下键值的对象
  - `domain`: 指定域名
  - `path`: 指定路径

- 字符串形式的 URL 地址
