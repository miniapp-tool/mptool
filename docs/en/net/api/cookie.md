# Cookie

## Cookie object

`@mptool/net` creates and serializes cookies in the following object format:

- `name`: cookie name
- `value`: cookie value
- `path`: cookie path
- `createdAt`: creation time (millisecond timestamp)
- `expires`: expiration time (a `Date` object)
- `maxAge`: maximum lifetime (seconds)
- `domain`: cookie domain
- `secure`: whether the cookie is sent only over HTTPS (mini-programs support HTTPS only, and real devices can always send it; it is skipped only for `http://` debugging URLs)
- `httpOnly`: whether the cookie is used only over HTTP
- `sameSite`: the SameSite attribute (`lax` / `strict` / `none`), persisted with the cookie

`name` and `value` are required; all other fields are optional.

## Cookie class

`@mptool/net` provides a `Cookie` class for working with cookie objects.

Constructor:

- `constructor(cookie: CookieType)`
  - `cookie`: the cookie object

Instance members:

- `name: string`: cookie name
- `value: string`: cookie value
- `domain: string`: cookie domain
- `path: string`: cookie path
- `createdAt: number`: creation time (millisecond timestamp), used for RFC 6265 cookie ordering
- `expires: number | "session" | "outdate"`: expiration time
- `httpOnly: boolean`: whether the cookie is used only over HTTP

Methods:

- `isExpired(): boolean`: checks whether the cookie has expired

- `isPersistence(): boolean`: checks whether the cookie can be persisted

- `isDomainMatched(domain: string): boolean`: checks whether the cookie matches a domain
  - `domain`: the domain

- `isPathMatched(path: string): boolean`: checks whether the cookie matches a path
  - `path`: the path

- `toString(): string`: converts the cookie to a string

- `toJSON(): CookieType`: serializes the cookie to an object
