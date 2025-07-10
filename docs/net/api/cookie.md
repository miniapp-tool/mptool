# Cookie

## Cookie 对象

`@mptool/net` 通过如下的对象格式格式生成/序列化 Cookie:

- `name`: Cookie 名称
- `value`: Cookie 值
- `path`: Cookie 路径
- `expires`: 过期时间 (Date 对象)
- `maxAge`: 最大存活时间 (秒)
- `domain`: Cookie 域名
- `secure`: 是否只在 HTTPS 下使用
- `httpOnly`: 是否只在 HTTP 下使用
- `sameSite`: 是否只在同域下使用

其中 `name` 和 `value` 时必须的，其他项是可选的。

## Cookie 类

`@mptool/net` 有一个 `Cookie` 类，用于处理 Cookie 对象。

构造函数:

- `constructor(cookie: CookieType)`
  - `cookie`: Cookie 对象

静态成员:

- `name: string`: Cookie 名称
- `value: string`: Cookie 值
- `domain: string`: Cookie 域名
- `path: string`: Cookie 路径
- `expires: number | "session" | "outdate"`: 过期时间
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
