# Change Log

All notable changes to this project will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.20.0](https://github.com/miniapp-tool/mptool/compare/v0.19.0...v0.20.0) (2026-10-31)

### ⚠ BREAKING CHANGES

- **skyline-enhance:** @mptool/skyline-enhance's $Config no longer accepts the maxDelay and
  minInterval options. Skyline has no onNavigate lifecycle and no navigation lock, so those
  options never had any effect; they were only accepted for config compatibility with
  @mptool/enhance. Remove them from the configuration — passing either option is now a type
  error.
- `Env` no longer includes `"qq"` and `env` never evaluates to `"qq"`: a QQ runtime now falls back to `"wx"` or `"js"`, so code branching on the QQ environment has to be removed.
- **enhance:** `injectComponent` now runs once per component registration and before `Component()`, instead of once per component instance inside `created`. Hooks that relied on the per-instance timing, or on mutating the instance, must move that logic to an instance lifecycle.
- **file:** `saveFile()` now throws `MpError` instead of returning `undefined`
  on failure; `saveOnlineFile()` no longer accepts the `onTask` option — use the
  `task` property on the returned promise instead.
- the QQ-only `Set-Cookie` rewriting in `CookieStore.applyHeader()` is gone; such headers are parsed as-is by `set-cookie-parser`.
- the QQ-only `theme` option is no longer passed to `wx.showModal()` by `showModal()` / `retry()`.

### ✨ Features

- **encoder:** support non-standard encoding labels in TextEncoder ([#1488](https://github.com/miniapp-tool/mptool/issues/1488)) ([9b134a8](https://github.com/miniapp-tool/mptool/commit/9b134a812fe0b2fb45fcb61c0a19bf3b7f76eb5c))
- **mock:** add a user-decision model for UI and permissions ([#1587](https://github.com/miniapp-tool/mptool/issues/1587)) ([faa81af](https://github.com/miniapp-tool/mptool/commit/faa81af8eb30b059cd737cca50d91a5f2d67e415))
- **mock:** add base64, system-config, performance and page APIs ([#1603](https://github.com/miniapp-tool/mptool/issues/1603)) ([1bacf28](https://github.com/miniapp-tool/mptool/commit/1bacf28b56de841075a63931401edbf292dde95b))
- **mock:** add manager stubs, non-target allowlist and coverage guard ([#1606](https://github.com/miniapp-tool/mptool/issues/1606)) ([06beac7](https://github.com/miniapp-tool/mptool/commit/06beac7691097ae2cceaf32764f09c2280b66819))
- **mock:** add media, share and audio APIs ([#1604](https://github.com/miniapp-tool/mptool/issues/1604)) ([98a1dfd](https://github.com/miniapp-tool/mptool/commit/98a1dfd48974c4adc06f7281e3b621fc4cce7d07)), references [#1603](https://github.com/miniapp-tool/mptool/issues/1603)
- **mock:** add the mockWx control plane ([#1525](https://github.com/miniapp-tool/mptool/issues/1525)) ([147b1f9](https://github.com/miniapp-tool/mptool/commit/147b1f9d9416aebe44079b74d446e5f95d40ba80))
- **mock:** add WXML node fixtures for selector queries ([#1591](https://github.com/miniapp-tool/mptool/issues/1591)) ([69d9e0c](https://github.com/miniapp-tool/mptool/commit/69d9e0c197982d165c8e7fa560ef0feca7654fc1))
- **mock:** align storage semantics with the real runtime ([#1542](https://github.com/miniapp-tool/mptool/issues/1542)) ([802b3fd](https://github.com/miniapp-tool/mptool/commit/802b3fd31d3f8fb492ae013af3abf4a577c48af3))
- **mock:** implement every on/off event pair ([#1601](https://github.com/miniapp-tool/mptool/issues/1601)) ([1b35fc1](https://github.com/miniapp-tool/mptool/commit/1b35fc181475be7d92afa8dc9e0c8c26abcf77f0))
- **mock:** normalise the FileSystemManager and complete its API ([#1586](https://github.com/miniapp-tool/mptool/issues/1586)) ([d9bfc5e](https://github.com/miniapp-tool/mptool/commit/d9bfc5e4f6495de78315e6dba3e27bea98bf95cc))
- **mock:** simulate the page stack and page lifecycles ([#1588](https://github.com/miniapp-tool/mptool/issues/1588)) ([751964c](https://github.com/miniapp-tool/mptool/commit/751964c3ef149eda9b1d44cb3604da42ee096948))
- **mock:** trigger events from real mock behaviour ([#1602](https://github.com/miniapp-tool/mptool/issues/1602)) ([f93f2d9](https://github.com/miniapp-tool/mptool/commit/f93f2d9ea1af4d71d20f12737f5bb7ebab734763))
- **mock:** unify system information, network and env ([#1593](https://github.com/miniapp-tool/mptool/issues/1593)) ([a1cf8d8](https://github.com/miniapp-tool/mptool/commit/a1cf8d897be1582e619a6160aad4ee1a73e9af46))
- **net:** add request cancellation, timeout and retry ([#1513](https://github.com/miniapp-tool/mptool/issues/1513)) ([f7bd9e1](https://github.com/miniapp-tool/mptool/commit/f7bd9e1d1ddb48da32e245749042bf50ae0f7932))
- **parser:** add opt-in input length and nesting limits ([#1585](https://github.com/miniapp-tool/mptool/issues/1585)) ([b27fe1b](https://github.com/miniapp-tool/mptool/commit/b27fe1bce4b12d00f0c94f09a45ce6d8bfe5735d))
- **run:** add an opt-in wall-clock budget (maxDuration) ([#1607](https://github.com/miniapp-tool/mptool/issues/1607)) ([82c8863](https://github.com/miniapp-tool/mptool/commit/82c8863853f023a71834e82a3335ccaef2bbfd3d))
- **run:** expose parse budgets on every public API ([#1539](https://github.com/miniapp-tool/mptool/issues/1539)) ([04dc9a9](https://github.com/miniapp-tool/mptool/commit/04dc9a9c9a0b9f543d2d31563851ace861c50360))

### 🐛 Bug Fixes

- **api:** avoid duplicate download failure toasts ([#1552](https://github.com/miniapp-tool/mptool/issues/1552)) ([0720308](https://github.com/miniapp-tool/mptool/commit/0720308d1af215ef9c1300be355bfc82d925697a))
- **api:** only hide the loading that download() showed itself ([#1659](https://github.com/miniapp-tool/mptool/issues/1659)) ([6d85e14](https://github.com/miniapp-tool/mptool/commit/6d85e1420e7b70058a1a2be0e19c7ee7405bfe91))
- **api:** only log an error for abnormal network types ([#1658](https://github.com/miniapp-tool/mptool/issues/1658)) ([2fd2fd3](https://github.com/miniapp-tool/mptool/commit/2fd2fd3d67a79a57e7ff51a5ea876325f4d4c53c))
- **api:** reject withScope when the permission modal is cancelled or cannot open ([#1657](https://github.com/miniapp-tool/mptool/issues/1657)) ([321327b](https://github.com/miniapp-tool/mptool/commit/321327b1ec659d066720f7336a427c0a021093d2))
- **api:** settle withScope on modal failure, validate versions, warn on unsupported saveDocument ([#1534](https://github.com/miniapp-tool/mptool/issues/1534)) ([da46a3d](https://github.com/miniapp-tool/mptool/commit/da46a3d1ebf386581639300bfc41e606b09583e5))
- **api:** strip document url query and hash without a regex ([#1501](https://github.com/miniapp-tool/mptool/issues/1501)) ([24485fd](https://github.com/miniapp-tool/mptool/commit/24485fd9c25872a77a6aff396708b079ac53b352)), references [#16](https://github.com/miniapp-tool/mptool/issues/16)
- **ci:** fail the release when npmmirror sync fails ([#1510](https://github.com/miniapp-tool/mptool/issues/1510)) ([46fe8cc](https://github.com/miniapp-tool/mptool/commit/46fe8cc184a8fc72f88c247fc83cfd5a1f9718b1))
- **deps:** move build-time-inlined dependencies to devDependencies ([#1487](https://github.com/miniapp-tool/mptool/issues/1487)) ([2beef8c](https://github.com/miniapp-tool/mptool/commit/2beef8c115e2e35bdd20b3d245e9a942071fbf18))
- **enhance:** bind onAwake to the page and app instance ([#1661](https://github.com/miniapp-tool/mptool/issues/1661)) ([d488ce3](https://github.com/miniapp-tool/mptool/commit/d488ce3f137595ce0ef6652b021233d50275e884))
- **enhance:** bind pre-instance lifecycles and narrow $preload type ([#1610](https://github.com/miniapp-tool/mptool/issues/1610)) ([b80a5ab](https://github.com/miniapp-tool/mptool/commit/b80a5abbff0981c41ab8a97e47f23c44855b6c95))
- **enhance:** bound the execution of remote hot-reload code ([#1598](https://github.com/miniapp-tool/mptool/issues/1598)) ([b1a9849](https://github.com/miniapp-tool/mptool/commit/b1a9849b3c52dff1d913b3c0dc0949c52cadee08))
- **enhance:** catch rejected lifecycles and harden navigation ([#1592](https://github.com/miniapp-tool/mptool/issues/1592)) ([b482dfb](https://github.com/miniapp-tool/mptool/commit/b482dfbdcc88410de94d74c527e6d791708075b1))
- **enhance:** declare $getRef in component instance types ([#1669](https://github.com/miniapp-tool/mptool/issues/1669)) ([be10608](https://github.com/miniapp-tool/mptool/commit/be10608d6f8bfcfe9f8d686fda31fcccc40525af))
- **enhance:** drop unloaded pages from the hot-reload pending set ([#1508](https://github.com/miniapp-tool/mptool/issues/1508)) ([d6336b3](https://github.com/miniapp-tool/mptool/commit/d6336b3a741434f45d5e1b5bcb567bb0b87a220e))
- **enhance:** give every page instance its own $refs ([#1656](https://github.com/miniapp-tool/mptool/issues/1656)) ([d44d581](https://github.com/miniapp-tool/mptool/commit/d44d5819fc71b3a086ee945bc91ebd782cc31904))
- **enhance:** give every page instance its own page state ([#1546](https://github.com/miniapp-tool/mptool/issues/1546)) ([47339bc](https://github.com/miniapp-tool/mptool/commit/47339bc146d816d7b17f9534809270f40f9551d9))
- **enhance:** harden hot reload fetches and page lifecycle listeners ([#1608](https://github.com/miniapp-tool/mptool/issues/1608)) ([b73f642](https://github.com/miniapp-tool/mptool/commit/b73f6424ae359a152a340cb8a39aab77206f8eb9))
- **enhance:** merge hot-reload lifecycles with framework hooks ([#1667](https://github.com/miniapp-tool/mptool/issues/1667)) ([70c30d5](https://github.com/miniapp-tool/mptool/commit/70c30d52734bfd43b1d4008ec31b56b15708321b))
- **enhance:** normalize $getPath output and harden navigation helpers ([#1605](https://github.com/miniapp-tool/mptool/issues/1605)) ([9b3a6f3](https://github.com/miniapp-tool/mptool/commit/9b3a6f32f62ebbfdfffb3742cc328284106b5a05))
- **enhance:** only dispatch function methods in bind ([#1665](https://github.com/miniapp-tool/mptool/issues/1665)) ([c71c9ec](https://github.com/miniapp-tool/mptool/commit/c71c9ec8550b161c6f5d4ae1c13292ac41eb7318))
- **enhance:** register page lifecycles after framework setup ([#1663](https://github.com/miniapp-tool/mptool/issues/1663)) ([f6de63d](https://github.com/miniapp-tool/mptool/commit/f6de63db2864261e356dca2630fbb3bbb6210f11))
- **enhance:** release navigation lock after switchTab to a loaded page ([#1480](https://github.com/miniapp-tool/mptool/issues/1480)) ([114566e](https://github.com/miniapp-tool/mptool/commit/114566ee71d28f5c9e66402f1ab65be79b2675ea))
- **enhance:** release navigation lock only after target page is ready ([#1666](https://github.com/miniapp-tool/mptool/issues/1666)) ([13bf7c9](https://github.com/miniapp-tool/mptool/commit/13bf7c922853741c718c6bf5f339eba43db16bbe))
- **enhance:** run injectComponent before component registration ([#1502](https://github.com/miniapp-tool/mptool/issues/1502)) ([c68db94](https://github.com/miniapp-tool/mptool/commit/c68db946a5464097a399e91bba24b72d86b57f12))
- **enhance:** stop leaking page instances when hot reload is unavailable ([#1492](https://github.com/miniapp-tool/mptool/issues/1492)) ([dbe1cab](https://github.com/miniapp-tool/mptool/commit/dbe1cab4d0962dc130677f2c366a4343ad0fe7f2))
- **enhance:** surface the navigation lock in the trigger result type ([#1548](https://github.com/miniapp-tool/mptool/issues/1548)) ([c1cbf09](https://github.com/miniapp-tool/mptool/commit/c1cbf09acec404a16b296c90849c493d7dd2fc2b))
- **enhance:** throw MpError when $Config is missing ([#1550](https://github.com/miniapp-tool/mptool/issues/1550)) ([d53662b](https://github.com/miniapp-tool/mptool/commit/d53662bd25604c05d3f3f5bae9f1ff86997bfd04))
- **file:** clear the in-memory store when persisted keys are removed ([#1563](https://github.com/miniapp-tool/mptool/issues/1563)) ([1a3302a](https://github.com/miniapp-tool/mptool/commit/1a3302a0ac1c6adb04657b1bddf62593e390f5ca))
- **file:** make storage errors observable and expire once values by session ([#1544](https://github.com/miniapp-tool/mptool/issues/1544)) ([2388c24](https://github.com/miniapp-tool/mptool/commit/2388c24ccb3518dfc18cb0feb2a1dc4c17ad8c6f))
- **file:** reject paths that escape the user data directory ([#1489](https://github.com/miniapp-tool/mptool/issues/1489)) ([23ee3a6](https://github.com/miniapp-tool/mptool/commit/23ee3a65bf544931ccff5e88640ff7e74b28d15f))
- **file:** reject values writeJSON cannot serialize ([#1561](https://github.com/miniapp-tool/mptool/issues/1561)) ([ebc88a6](https://github.com/miniapp-tool/mptool/commit/ebc88a6dd72f138d3dce45214fc635c54f836faf))
- **file:** return save results and expose the download task ([#1545](https://github.com/miniapp-tool/mptool/issues/1545)) ([d37295a](https://github.com/miniapp-tool/mptool/commit/d37295acca344de59c6ff1c2d7f83d0ba56add80))
- **file:** surface read errors instead of reporting missing data ([#1560](https://github.com/miniapp-tool/mptool/issues/1560)) ([7aab403](https://github.com/miniapp-tool/mptool/commit/7aab403fc2ac9e87dcd27ab20cd8ee1a23e193c0))
- **file:** write strings and binary data as-is instead of JSON ([#1482](https://github.com/miniapp-tool/mptool/issues/1482)) ([7c1d420](https://github.com/miniapp-tool/mptool/commit/7c1d4204ae9b7faac44e8daf4c46412593d42aad))
- **metadata:** correct skyline package links and add missing miniprogram fields ([#1486](https://github.com/miniapp-tool/mptool/issues/1486)) ([8bab130](https://github.com/miniapp-tool/mptool/commit/8bab13013781f8f1ba1d285e6d6e6058c2131280))
- **metadata:** mark miniprogram-api-typings as an optional peer dependency ([#1512](https://github.com/miniapp-tool/mptool/issues/1512)) ([b242b45](https://github.com/miniapp-tool/mptool/commit/b242b45dbd484ccc239eabbafc29c215c50692de))
- **mock:** align injection edge cases with the documented contract ([#1533](https://github.com/miniapp-tool/mptool/issues/1533)) ([31a8cf4](https://github.com/miniapp-tool/mptool/commit/31a8cf481bb4968014927dfaf5f0e7bbae2719b7)), references [#1525](https://github.com/miniapp-tool/mptool/issues/1525)
- **mock:** return a real RequestTask from wx.request ([#1518](https://github.com/miniapp-tool/mptool/issues/1518)) ([3550935](https://github.com/miniapp-tool/mptool/commit/3550935d0c39664bcc787d5a5ded15668365a3b9)), references [#1513](https://github.com/miniapp-tool/mptool/issues/1513)
- **mock:** settle rejected async responders, reset route regexps, restore tab pages ([#1642](https://github.com/miniapp-tool/mptool/issues/1642)) ([4037866](https://github.com/miniapp-tool/mptool/commit/4037866b58760c8f45deb9b598b15acea7e537e9))
- **net:** accept upper-case schemes and protocol-relative URLs ([#1654](https://github.com/miniapp-tool/mptool/issues/1654)) ([2d017ca](https://github.com/miniapp-tool/mptool/commit/2d017ca14d53dfa20591a009bdac941d33a036b6))
- **net:** batch cookie storage writes and cap the cookie jar ([#1500](https://github.com/miniapp-tool/mptool/issues/1500)) ([c7abeb3](https://github.com/miniapp-tool/mptool/commit/c7abeb3cb0954d48e4154c90ee15488cf7f522e1))
- **net:** enforce the Headers contract and normalize cookie domains ([#1514](https://github.com/miniapp-tool/mptool/issues/1514)) ([4b8524c](https://github.com/miniapp-tool/mptool/commit/4b8524c691352f9db708eb8be5bc76c07dc94978))
- **net:** join custom Cookie header and cookieStore with "; " ([#1644](https://github.com/miniapp-tool/mptool/issues/1644)) ([868c711](https://github.com/miniapp-tool/mptool/commit/868c7110d63f4c5f3d486ca057d93842e976663f))
- **net:** keep percent-encoded cookie values raw when parsing Set-Cookie ([#1652](https://github.com/miniapp-tool/mptool/issues/1652)) ([823ce2a](https://github.com/miniapp-tool/mptool/commit/823ce2a9d5212f7d6d6006a6263774f329e8c7f5))
- **net:** key cookies by name, domain and path ([#1496](https://github.com/miniapp-tool/mptool/issues/1496)) ([68b3173](https://github.com/miniapp-tool/mptool/commit/68b3173d3abdcd1e9d2ecfc517219943508c942a)), references [#1497](https://github.com/miniapp-tool/mptool/issues/1497)
- **net:** list cookies from every path in CookieStore.list ([#1645](https://github.com/miniapp-tool/mptool/issues/1645)) ([aa400b3](https://github.com/miniapp-tool/mptool/commit/aa400b37fef31e39a0ee6d82d4daafaccac5604c))
- **net:** persist Secure and SameSite cookie attributes ([#1509](https://github.com/miniapp-tool/mptool/issues/1509)) ([bffa5e2](https://github.com/miniapp-tool/mptool/commit/bffa5e26abf27e3f16869766b8e69ad193b7f8ba))
- **net:** redact credentials and cap bodies in debug logs ([#1570](https://github.com/miniapp-tool/mptool/issues/1570)) ([fbe08de](https://github.com/miniapp-tool/mptool/commit/fbe08defb5da4d6bc86865eba6029d9b40b106f4))
- **net:** reject request urls and cookie scopes without a domain ([#1517](https://github.com/miniapp-tool/mptool/issues/1517)) ([3568a31](https://github.com/miniapp-tool/mptool/commit/3568a3173ca51064173b616e3d5713b19e7f07d9))
- **net:** send cookies in RFC 6265 priority order ([#1497](https://github.com/miniapp-tool/mptool/issues/1497)) ([9e96037](https://github.com/miniapp-tool/mptool/commit/9e96037eaad01cc6fc8fbb1bbf74e6fe33734536))
- **net:** stop callers from overriding request callbacks ([#1499](https://github.com/miniapp-tool/mptool/issues/1499)) ([c678d84](https://github.com/miniapp-tool/mptool/commit/c678d84c0fd0c80a12381fe17e9066dbd8b946bd))
- **net:** validate cookie Domain and keep host-only cookies host-only ([#1481](https://github.com/miniapp-tool/mptool/issues/1481)) ([1fea35c](https://github.com/miniapp-tool/mptool/commit/1fea35cc1caf01b9926cb3e521731ff1487434ec))
- **parser:** bound svg recursion by maxDepth ([#1641](https://github.com/miniapp-tool/mptool/issues/1641)) ([72cf87f](https://github.com/miniapp-tool/mptool/commit/72cf87f587885471989a97e76e8c6a030fb8f421))
- **parser:** encode only URI-significant characters in SVG data URIs ([#1541](https://github.com/miniapp-tool/mptool/issues/1541)) ([c41bbd9](https://github.com/miniapp-tool/mptool/commit/c41bbd9c04c18e9611a04ce8a8ddb671abf26cc5))
- **parser:** keep inline whitespace in rich text conversion ([#1511](https://github.com/miniapp-tool/mptool/issues/1511)) ([5c67497](https://github.com/miniapp-tool/mptool/commit/5c674974b6c54afcb5616e14dd295eea8f264387))
- **parser:** normalize CRLF and CR in rich text nodes to LF ([#1504](https://github.com/miniapp-tool/mptool/issues/1504)) ([7cf24a6](https://github.com/miniapp-tool/mptool/commit/7cf24a6c435e8d0091cf7f48dc9eee715e94e6e7))
- **parser:** preserve text of unknown containers and drop invisible elements ([#1531](https://github.com/miniapp-tool/mptool/issues/1531)) ([d56fb33](https://github.com/miniapp-tool/mptool/commit/d56fb3300d140e015ddea62e144d24ad1a2786e5))
- **parser:** stop mutating caller-provided DOM when converting SVG ([#1584](https://github.com/miniapp-tool/mptool/issues/1584)) ([7d6bbe7](https://github.com/miniapp-tool/mptool/commit/7d6bbe727d290e577f6e350deca99dcc8aa6aa94))
- **parser:** use the converted tag name for html/body class names ([#1540](https://github.com/miniapp-tool/mptool/issues/1540)) ([27e46fd](https://github.com/miniapp-tool/mptool/commit/27e46fd73c64ba10e501adff50eaf6cc2241bcc6))
- **renovate:** use the official helper for @types/node major updates ([#1559](https://github.com/miniapp-tool/mptool/issues/1559)) ([3dd1585](https://github.com/miniapp-tool/mptool/commit/3dd1585527750ff33f0c6528b0cdd8427ab4abf8))
- **run:** add parse-time early errors for bindings and control flow ([#1575](https://github.com/miniapp-tool/mptool/issues/1575)) ([cf4f742](https://github.com/miniapp-tool/mptool/commit/cf4f742dd9310acf5a1f35b049d924dfe0a7c39d))
- **run:** add strict-mode early errors ([#1596](https://github.com/miniapp-tool/mptool/issues/1596)) ([2ad6c0f](https://github.com/miniapp-tool/mptool/commit/2ad6c0f765f8f7f23e3ba3a942d50c45156f5d9c))
- **run:** align the arguments object with ECMAScript behaviour ([#1579](https://github.com/miniapp-tool/mptool/issues/1579)) ([d566908](https://github.com/miniapp-tool/mptool/commit/d566908d172619081709fe71251f32bcca0e25de))
- **run:** always suspend a microtask at await, even for non-thenables ([#1528](https://github.com/miniapp-tool/mptool/issues/1528)) ([4515276](https://github.com/miniapp-tool/mptool/commit/4515276c839e88f16f0e1dce60f3fa07b7877b1c))
- **run:** bound speculative parsing to stop exponential backtracking ([#1519](https://github.com/miniapp-tool/mptool/issues/1519)) ([3e62e6f](https://github.com/miniapp-tool/mptool/commit/3e62e6f0347a5a5f2d6bd238a453faf5bd2e9f0f))
- **run:** close for-of iterators on abrupt loop exit ([#1582](https://github.com/miniapp-tool/mptool/issues/1582)) ([d8d9700](https://github.com/miniapp-tool/mptool/commit/d8d9700fb532501cc238e8ca0f984ef1aaf49c43))
- **run:** copy Symbol keys in object spread and rest ([#1538](https://github.com/miniapp-tool/mptool/issues/1538)) ([063bc70](https://github.com/miniapp-tool/mptool/commit/063bc70a7bd03075c2ff79c0678a762eb28c4544))
- **run:** correct object property keys, CoverInitializedName and regex/division lexing ([#1664](https://github.com/miniapp-tool/mptool/issues/1664)) ([3f41153](https://github.com/miniapp-tool/mptool/commit/3f411534cf66a27f0330a6590f1988bc5d77cad7))
- **run:** correct super property read/write semantics ([#1653](https://github.com/miniapp-tool/mptool/issues/1653)) ([4a007d7](https://github.com/miniapp-tool/mptool/commit/4a007d7880803ca03c1fbbfdde01f419c83aa72d))
- **run:** evaluate legacy octal literals by their octal value ([#1522](https://github.com/miniapp-tool/mptool/issues/1522)) ([6c40102](https://github.com/miniapp-tool/mptool/commit/6c4010219b854f85506f6b61eaaef6aab5655e24))
- **run:** fix async resumption stack accounting and try-block scoping ([#1643](https://github.com/miniapp-tool/mptool/issues/1643)) ([58bcc1a](https://github.com/miniapp-tool/mptool/commit/58bcc1aaa29e756328e047adc99b11fb744fa254))
- **run:** give base class instances a normal Object.prototype chain ([#1521](https://github.com/miniapp-tool/mptool/issues/1521)) ([9c7f633](https://github.com/miniapp-tool/mptool/commit/9c7f633a0c964b51c6a2a5860760852b98b10e7f))
- **run:** honor sloppy assignment semantics for property writes ([#1530](https://github.com/miniapp-tool/mptool/issues/1530)) ([3f2381d](https://github.com/miniapp-tool/mptool/commit/3f2381d299b0080f7b2deb88058059cb02288a59))
- **run:** implement ASI restricted productions ([#1574](https://github.com/miniapp-tool/mptool/issues/1574)) ([258cfd4](https://github.com/miniapp-tool/mptool/commit/258cfd425ee7f993f4e6778fada1a3c0bec530b1))
- **run:** infer function names and expose class method source ([#1595](https://github.com/miniapp-tool/mptool/issues/1595)) ([65ceba2](https://github.com/miniapp-tool/mptool/commit/65ceba2de5fc4dcf07b2ad0bbe35687ff65edebe))
- **run:** infer function names only for anonymous function definitions ([#1620](https://github.com/miniapp-tool/mptool/issues/1620)) ([e453fb2](https://github.com/miniapp-tool/mptool/commit/e453fb2cc75376407e0628ed44edbd310633bd26))
- **run:** inherit Object.prototype on the sandbox global, filter eval/Function ([#1580](https://github.com/miniapp-tool/mptool/issues/1580)) ([ab293a1](https://github.com/miniapp-tool/mptool/commit/ab293a180eaad8a0edf9a11f49ea6d4e423c0817))
- **run:** keep global mirroring scoped to var-like bindings and drop ES2020 syntax ([#1668](https://github.com/miniapp-tool/mptool/issues/1668)) ([d2e6f64](https://github.com/miniapp-tool/mptool/commit/d2e6f645f3fc5e5d8d865dda4032c856617649a8))
- **run:** lex regex literals correctly at statement boundaries ([#1594](https://github.com/miniapp-tool/mptool/issues/1594)) ([f1eb232](https://github.com/miniapp-tool/mptool/commit/f1eb2320de3742e81264ea22f8745874d32ba416))
- **run:** make Runtime reject nested or concurrent runs ([#1581](https://github.com/miniapp-tool/mptool/issues/1581)) ([48f3a5c](https://github.com/miniapp-tool/mptool/commit/48f3a5c7ac5fe1e782df3259e9cfa9d8f0559890))
- **run:** match function reflection for name, length and toString ([#1578](https://github.com/miniapp-tool/mptool/issues/1578)) ([0fcf55d](https://github.com/miniapp-tool/mptool/commit/0fcf55dacb5c65ce1b9805270dcac032e648ff7e))
- **run:** normalize CRLF and CR to LF in template cooked values ([#1535](https://github.com/miniapp-tool/mptool/issues/1535)) ([e3bc1d3](https://github.com/miniapp-tool/mptool/commit/e3bc1d381bfb32df8dbbd877f2b4d9d7efd8ac00))
- **run:** only reject runSync when async code actually starts ([#1527](https://github.com/miniapp-tool/mptool/issues/1527)) ([73220f8](https://github.com/miniapp-tool/mptool/commit/73220f8115549899390f7561edfbf19c2f282f37))
- **run:** predeclare lexical bindings and give switch a block scope ([#1577](https://github.com/miniapp-tool/mptool/issues/1577)) ([4c35736](https://github.com/miniapp-tool/mptool/commit/4c3573643199c6345a43b2c820505cfb6fbcb62d))
- **run:** propagate optional-chain short-circuiting through the whole chain ([#1520](https://github.com/miniapp-tool/mptool/issues/1520)) ([3a69013](https://github.com/miniapp-tool/mptool/commit/3a69013bb484406d84ce6cc30e0b93843821732c))
- **run:** release maxStack depth when the overflow error is thrown ([#1526](https://github.com/miniapp-tool/mptool/issues/1526)) ([b5732f7](https://github.com/miniapp-tool/mptool/commit/b5732f73ebb34976339a3e9bd4256698ed06a034))
- **run:** reset execution budget for host-called functions and fix createFunction plumbing ([#1662](https://github.com/miniapp-tool/mptool/issues/1662)) ([6023cee](https://github.com/miniapp-tool/mptool/commit/6023ceeb1ec259fe8be0ae47692f68558594355e))
- **run:** resolve compound-assignment targets exactly once ([#1523](https://github.com/miniapp-tool/mptool/issues/1523)) ([796ebb9](https://github.com/miniapp-tool/mptool/commit/796ebb9177927750dd027967d46e81d34339a8e5))
- **run:** skip computed keys of short-circuited delete chains ([#1537](https://github.com/miniapp-tool/mptool/issues/1537)) ([d83c03d](https://github.com/miniapp-tool/mptool/commit/d83c03d25128a217ae60f3f912c77bd33be146f7))
- **run:** strip quotes from string-literal property names ([#1576](https://github.com/miniapp-tool/mptool/issues/1576)) ([4d72f17](https://github.com/miniapp-tool/mptool/commit/4d72f17e9b3b76fe9f814b3f8176447c1035437d))
- **run:** support super() inside arrows created by a derived constructor ([#1529](https://github.com/miniapp-tool/mptool/issues/1529)) ([7b3141b](https://github.com/miniapp-tool/mptool/commit/7b3141b74f2c457dac65948767c20e90aaf58ce9))
- **run:** throw TypeError when a template interpolation is a Symbol ([#1536](https://github.com/miniapp-tool/mptool/issues/1536)) ([0f25119](https://github.com/miniapp-tool/mptool/commit/0f251198d0838dffb675f8a8c04ece846f7684c7))
- **shared,mock:** probe realtime log filter and avoid duplicate error output ([#1640](https://github.com/miniapp-tool/mptool/issues/1640)) ([07314ec](https://github.com/miniapp-tool/mptool/commit/07314ecbf2a6eccdaca1e91d6b5dd22914bf7a91))
- **shared:** make queue lifecycle safe and preserve this in once ([#1639](https://github.com/miniapp-tool/mptool/issues/1639)) ([a5c2c58](https://github.com/miniapp-tool/mptool/commit/a5c2c58de399b8f12796dc334e7669393701d58f))
- **skyline-enhance:** drop enhance-only instance types from the slim package ([#1491](https://github.com/miniapp-tool/mptool/issues/1491)) ([5c73abf](https://github.com/miniapp-tool/mptool/commit/5c73abfaddf784287fcd03cd1276b0319c64bf96))
- **skyline-enhance:** normalize page paths like enhance ([#1494](https://github.com/miniapp-tool/mptool/issues/1494)) ([e8bc22e](https://github.com/miniapp-tool/mptool/commit/e8bc22e26b94b2a94c4e6e5dfb3dd97ab1ce4d13))
- **skyline:** align the bundle export surface with @mptool/all ([#1551](https://github.com/miniapp-tool/mptool/issues/1551)) ([952acfe](https://github.com/miniapp-tool/mptool/commit/952acfe96a67cff776f49040e7d584acff839687))

### 🚀 Performance Improvements

- **encoder:** build a reverse GB18030 index instead of scanning ([#1547](https://github.com/miniapp-tool/mptool/issues/1547)) ([dbfb0cf](https://github.com/miniapp-tool/mptool/commit/dbfb0cf1d25bb298b84c2ee9cec392b2a09a41a6))
- **encoder:** decode the gb18030 index lazily and padding-aware ([#1564](https://github.com/miniapp-tool/mptool/issues/1564)) ([4e4fb26](https://github.com/miniapp-tool/mptool/commit/4e4fb2645a92eeee8b025ce864a1bcf609bdfa7d))
- **run:** memoize async-path AST scans per node ([#1583](https://github.com/miniapp-tool/mptool/issues/1583)) ([09a7a2a](https://github.com/miniapp-tool/mptool/commit/09a7a2a9ffd4da14dd23b585a1da79b4d555afdc))

### Documentation

- add AGENTS.md as the canonical agent guide ([777176d](https://github.com/miniapp-tool/mptool/commit/777176d615f471ec65813629faa370a9f7983033))
- add an English guide under /en/ ([#1624](https://github.com/miniapp-tool/mptool/issues/1624)) ([b1433b7](https://github.com/miniapp-tool/mptool/commit/b1433b7a207b73c14455bf756180e87e4ba0fb88))
- add sections for all, skyline, encoder and shared plus install steps ([#1566](https://github.com/miniapp-tool/mptool/issues/1566)) ([874308b](https://github.com/miniapp-tool/mptool/commit/874308b69fcb0a50c6cb5c8da68950389ddf34db))
- add the English mock guide ([#1627](https://github.com/miniapp-tool/mptool/issues/1627)) ([5e019ce](https://github.com/miniapp-tool/mptool/commit/5e019ce696ecd58533832d5daa606fa989adcca9))
- **api:** document withScope and move page helpers out of contact ([#1649](https://github.com/miniapp-tool/mptool/issues/1649)) ([9765509](https://github.com/miniapp-tool/mptool/commit/976550906400c0af175e6900781eda26ade44874))
- complete the English documentation ([#1628](https://github.com/miniapp-tool/mptool/issues/1628)) ([28b713f](https://github.com/miniapp-tool/mptool/commit/28b713fa54ac35874e27666e48bf3d884615b8a4))
- **enhance,skyline,all:** fix $Page name and $Component props in examples ([#1646](https://github.com/miniapp-tool/mptool/issues/1646)) ([a43279b](https://github.com/miniapp-tool/mptool/commit/a43279b1f2d3015f16878f440f9fbd52d16ff7b1))
- **enhance:** correct the hot reload refresh timing ([#1493](https://github.com/miniapp-tool/mptool/issues/1493)) ([f061f07](https://github.com/miniapp-tool/mptool/commit/f061f07bc88c2f1a89aff4f88e0e70999f28a492))
- **enhance:** document the hotReloadPattern config option ([#1600](https://github.com/miniapp-tool/mptool/issues/1600)) ([015d4b8](https://github.com/miniapp-tool/mptool/commit/015d4b8e93af5015582996421f96e84d9d0f5b41))
- **enhance:** fix $bindRelaunch spelling, $refs examples and nav lock docs ([#1650](https://github.com/miniapp-tool/mptool/issues/1650)) ([8cf3d42](https://github.com/miniapp-tool/mptool/commit/8cf3d42bcbaa5dea3b3df447c468bfeecd388661))
- **enhance:** use onHotReload in the hot reload example ([#1495](https://github.com/miniapp-tool/mptool/issues/1495)) ([c463d47](https://github.com/miniapp-tool/mptool/commit/c463d476ab9947083c656f91c5df3b151954b816))
- **file:** fix storage.setAsync expire default and saveFile return type ([#1647](https://github.com/miniapp-tool/mptool/issues/1647)) ([5ea60ce](https://github.com/miniapp-tool/mptool/commit/5ea60cec1054edc3a11e688c02a09eb146ff48a3))
- **mock:** close out the mock documentation ([#1625](https://github.com/miniapp-tool/mptool/issues/1625)) ([3d59edd](https://github.com/miniapp-tool/mptool/commit/3d59edd8491940dbb84a9857f76cb26f67ae4df7))
- **net:** clarify which URLSearchParams class the body accepts ([#1571](https://github.com/miniapp-tool/mptool/issues/1571)) ([aa4569f](https://github.com/miniapp-tool/mptool/commit/aa4569fbb195f5d14f514baa82d07ef20af79fec))
- point AGENTS.md at package.json for toolchain versions ([#1506](https://github.com/miniapp-tool/mptool/issues/1506)) ([fd7a490](https://github.com/miniapp-tool/mptool/commit/fd7a490136b9bdab00e4941dba05b47c507a1b46))
- **shared:** document the logger output policy ([#1554](https://github.com/miniapp-tool/mptool/issues/1554)) ([81d229d](https://github.com/miniapp-tool/mptool/commit/81d229d5b0ca6a4f40f42a59a38be29e9acd2ca7))
- **shared:** fix MpError constructor and drop userEmitter export ([#1648](https://github.com/miniapp-tool/mptool/issues/1648)) ([18bb357](https://github.com/miniapp-tool/mptool/commit/18bb3575413c8a7d4372425f5594c25dbb3a7cfe))
- **skyline-enhance:** add docs chapter for the Skyline slim package ([#1524](https://github.com/miniapp-tool/mptool/issues/1524)) ([d5c0e78](https://github.com/miniapp-tool/mptool/commit/d5c0e78d8e93f1c3086b00af2e40a70787234148))
- sync run/parser package READMEs and known limitations ([#1597](https://github.com/miniapp-tool/mptool/issues/1597)) ([a0c6d30](https://github.com/miniapp-tool/mptool/commit/a0c6d30d858d93935a9bfe7a513fdf71d8590f46))
- type-check the VuePress site ([72a1624](https://github.com/miniapp-tool/mptool/commit/72a1624581777496a40343fd0facd15334f0909e))
- update bundle size numbers ([#1651](https://github.com/miniapp-tool/mptool/issues/1651)) ([0b9fa8c](https://github.com/miniapp-tool/mptool/commit/0b9fa8c0538505de084fe7a195c8e9c856cff138))
- update docs ([8261b16](https://github.com/miniapp-tool/mptool/commit/8261b16276ac0de8d3ced7ff90b04052b8c15adb))

### Styles

- fix linter ([ffee079](https://github.com/miniapp-tool/mptool/commit/ffee0793fe429a14bf756c794ac770209f086b1a))
- fix linter ([90dedf5](https://github.com/miniapp-tool/mptool/commit/90dedf57e6f7598ce1eb180672a87f1563d18939))
- update linter ([f92ba3a](https://github.com/miniapp-tool/mptool/commit/f92ba3a076ae4df561ccb1f6dd8a836c2dcb02e6))

### Miscellaneous Chores

- add WeChat DevTools automation skill for agents ([b4ec62a](https://github.com/miniapp-tool/mptool/commit/b4ec62ab21d01fd23023b4c5e54e82cf8cb304ad))
- **deps:** fix packages:update script for npm-check-updates v23 ([4cbe00d](https://github.com/miniapp-tool/mptool/commit/4cbe00d0dbd2f4e81851244c8d77219d5ac5cc1b))
- **deps:** update dependency @types/node to v24.13.4 ([#1439](https://github.com/miniapp-tool/mptool/issues/1439)) ([fcb925e](https://github.com/miniapp-tool/mptool/commit/fcb925e4084d846c442912914a19c27a3b34b6ff))
- **deps:** update dependency @types/node to v24.13.6 ([#1442](https://github.com/miniapp-tool/mptool/issues/1442)) ([bfe9ccd](https://github.com/miniapp-tool/mptool/commit/bfe9ccd7f6e5f69a99ab072ec2a50f850659856e))
- **deps:** update dependency @types/node to v24.19.0 ([#1452](https://github.com/miniapp-tool/mptool/issues/1452)) ([075fe02](https://github.com/miniapp-tool/mptool/commit/075fe02053b4d251fecd5a00730dbd3a4d3df358))
- **deps:** update dependency @types/node to v24.19.1 ([#1460](https://github.com/miniapp-tool/mptool/issues/1460)) ([f39d7a4](https://github.com/miniapp-tool/mptool/commit/f39d7a4ffe766a056989260117898b266f29504e))
- **deps:** update dependency @types/node to v24.19.2 ([#1466](https://github.com/miniapp-tool/mptool/issues/1466)) ([e5e7a28](https://github.com/miniapp-tool/mptool/commit/e5e7a287da9bf6ec29f6d044a66f9dca1bae22c5))
- **deps:** update dependency @vuepress/plugin-meilisearch to v2.0.0-rc.135 ([#1448](https://github.com/miniapp-tool/mptool/issues/1448)) ([5ef788c](https://github.com/miniapp-tool/mptool/commit/5ef788c85a3be354e025667973b72a046ecd66d9))
- **deps:** update dependency conventional-changelog-conventionalcommits to v10.4.0 ([#1429](https://github.com/miniapp-tool/mptool/issues/1429)) ([1c682e0](https://github.com/miniapp-tool/mptool/commit/1c682e089b50c54200da8da44777044302bf2806))
- **deps:** update dependency conventional-changelog-conventionalcommits to v10.4.1 ([#1461](https://github.com/miniapp-tool/mptool/issues/1461)) ([88d87d3](https://github.com/miniapp-tool/mptool/commit/88d87d3c1bc4a7be5481dad2a353f76f65d38a84))
- **deps:** update dependency oxc-config-hope to v0.3.14 ([#1457](https://github.com/miniapp-tool/mptool/issues/1457)) ([3783beb](https://github.com/miniapp-tool/mptool/commit/3783beb23bcdac75396852b09675f9ff001fbe8c))
- **deps:** update dependency oxfmt to v0.64.0 ([#1430](https://github.com/miniapp-tool/mptool/issues/1430)) ([c46fab7](https://github.com/miniapp-tool/mptool/commit/c46fab73339dd4dcec658991f65e364926c3fc6d))
- **deps:** update dependency oxfmt to v0.65.0 ([#1434](https://github.com/miniapp-tool/mptool/issues/1434)) ([9e27cd6](https://github.com/miniapp-tool/mptool/commit/9e27cd6c53bf3a9b184e30cf3b98ca59f0e9c6f3))
- **deps:** update dependency oxfmt to v0.66.0 ([#1435](https://github.com/miniapp-tool/mptool/issues/1435)) ([4be26af](https://github.com/miniapp-tool/mptool/commit/4be26af505273c1fd6fdd7cac0fb082bf5a38624))
- **deps:** update dependency oxfmt to v0.67.0 ([#1440](https://github.com/miniapp-tool/mptool/issues/1440)) ([b4ecf3b](https://github.com/miniapp-tool/mptool/commit/b4ecf3bffa85f6a21cce022284b8ab1606e2d176))
- **deps:** update dependency oxfmt to v0.68.0 ([#1446](https://github.com/miniapp-tool/mptool/issues/1446)) ([342b08f](https://github.com/miniapp-tool/mptool/commit/342b08fdb8098f853b078c528ce2c26434acd726))
- **deps:** update dependency oxfmt to v0.70.0 ([#1453](https://github.com/miniapp-tool/mptool/issues/1453)) ([e16c733](https://github.com/miniapp-tool/mptool/commit/e16c73371e110404d361aad25cf3bce1924c3b13))
- **deps:** update dependency oxfmt to v0.72.0 ([#1463](https://github.com/miniapp-tool/mptool/issues/1463)) ([ea6a2a4](https://github.com/miniapp-tool/mptool/commit/ea6a2a4ddfcf9e32bae194e1822cda9e8fbb0988))
- **deps:** update dependency oxfmt to v0.73.0 ([#1470](https://github.com/miniapp-tool/mptool/issues/1470)) ([438f3eb](https://github.com/miniapp-tool/mptool/commit/438f3eb6292a9efcd6d1cea4983e11ae01e43e6f))
- **deps:** update dependency oxfmt to v0.75.0 ([#1630](https://github.com/miniapp-tool/mptool/issues/1630)) ([77757b7](https://github.com/miniapp-tool/mptool/commit/77757b790dca422122869d55d0dedfdc4d388ee1))
- **deps:** update dependency oxlint to v1.82.0 ([#1424](https://github.com/miniapp-tool/mptool/issues/1424)) ([c02fa39](https://github.com/miniapp-tool/mptool/commit/c02fa3959b2816f1b10b42e1a45c934b0aeee4c3))
- **deps:** update dependency oxlint to v1.83.0 ([#1447](https://github.com/miniapp-tool/mptool/issues/1447)) ([dcaed8e](https://github.com/miniapp-tool/mptool/commit/dcaed8ed636fbf970a043892680cf4af32b75148))
- **deps:** update dependency oxlint to v1.85.0 ([#1454](https://github.com/miniapp-tool/mptool/issues/1454)) ([26d4784](https://github.com/miniapp-tool/mptool/commit/26d478465af28c1c624a844b5310075cc5492dff))
- **deps:** update dependency oxlint to v1.87.0 ([#1464](https://github.com/miniapp-tool/mptool/issues/1464)) ([45454fe](https://github.com/miniapp-tool/mptool/commit/45454fe58e7fb0230f316fc492c1cc58f084061b))
- **deps:** update dependency oxlint to v1.88.0 ([#1471](https://github.com/miniapp-tool/mptool/issues/1471)) ([b07210c](https://github.com/miniapp-tool/mptool/commit/b07210ca07b1c3a1da2e07a5b1cf4f33244be5d8))
- **deps:** update dependency oxlint to v1.90.0 ([#1631](https://github.com/miniapp-tool/mptool/issues/1631)) ([0bef68e](https://github.com/miniapp-tool/mptool/commit/0bef68e5773829f9eb006448e81c2423cc13a126))
- **deps:** update dependency oxlint-tsgolint to v7.0.2002 ([#1443](https://github.com/miniapp-tool/mptool/issues/1443)) ([b87ae7a](https://github.com/miniapp-tool/mptool/commit/b87ae7ae78d220a03b3a8613868d9fa3de41c42c))
- **deps:** update dependency oxlint-tsgolint to v7.0.2003 ([#1449](https://github.com/miniapp-tool/mptool/issues/1449)) ([8c8c196](https://github.com/miniapp-tool/mptool/commit/8c8c196bf194ad4cad565078c6c18aaabd7c6679))
- **deps:** update dependency oxlint-tsgolint to v7.0.2005 ([#1490](https://github.com/miniapp-tool/mptool/issues/1490)) ([c3f34df](https://github.com/miniapp-tool/mptool/commit/c3f34dffd8be9e5d5149570a8a9e46e70a2e0da4))
- **deps:** update dependency publint to v0.3.24 ([#1427](https://github.com/miniapp-tool/mptool/issues/1427)) ([fc04965](https://github.com/miniapp-tool/mptool/commit/fc0496583264e4a6dd22e01316887a819c8a1314))
- **deps:** update dependency publint to v0.3.25 ([#1459](https://github.com/miniapp-tool/mptool/issues/1459)) ([c7e969d](https://github.com/miniapp-tool/mptool/commit/c7e969d2bc50c02e6ea515881534b592cba81914))
- **deps:** update dependency sass-embedded to v1.103.1 ([#1431](https://github.com/miniapp-tool/mptool/issues/1431)) ([4d7c83e](https://github.com/miniapp-tool/mptool/commit/4d7c83eaf69333296cef6e5e8356fa342ccfd8f0))
- **deps:** update dependency sass-embedded to v1.104.0 ([#1436](https://github.com/miniapp-tool/mptool/issues/1436)) ([9f03f5f](https://github.com/miniapp-tool/mptool/commit/9f03f5fc46af0290cfa7ae2d6c7232fe89e12818))
- **deps:** update dependency sass-embedded to v1.104.1 ([#1441](https://github.com/miniapp-tool/mptool/issues/1441)) ([67a1afa](https://github.com/miniapp-tool/mptool/commit/67a1afabc5aad78c352fc6e3a299c2a0032c2341))
- **deps:** update dependency sass-embedded to v1.105.0 ([#1455](https://github.com/miniapp-tool/mptool/issues/1455)) ([6fe9508](https://github.com/miniapp-tool/mptool/commit/6fe950831867fc5e9470c8e4d0667a3269523bb3))
- **deps:** update dependency sass-embedded to v1.105.2 ([#1472](https://github.com/miniapp-tool/mptool/issues/1472)) ([2f194b1](https://github.com/miniapp-tool/mptool/commit/2f194b125be50884180e988351f2112e86a0f030))
- **deps:** update dependency set-cookie-parser to v3.1.3 ([#1462](https://github.com/miniapp-tool/mptool/issues/1462)) ([e2ad378](https://github.com/miniapp-tool/mptool/commit/e2ad378c4b6f08e38b29d06dfe844ae6eb406327))
- **deps:** update dependency set-cookie-parser to v3.1.4 ([#1473](https://github.com/miniapp-tool/mptool/issues/1473)) ([49d9835](https://github.com/miniapp-tool/mptool/commit/49d98359e55c987d11aa1bbfa81a8b5be8b7d4b5))
- **deps:** update dependency tsdown to v0.23.0 ([#1437](https://github.com/miniapp-tool/mptool/issues/1437)) ([09dc3c0](https://github.com/miniapp-tool/mptool/commit/09dc3c06e7af98aaa8582b5792d3da74df9260e2))
- **deps:** update dependency tsdown to v0.23.2 ([#1515](https://github.com/miniapp-tool/mptool/issues/1515)) ([29b6430](https://github.com/miniapp-tool/mptool/commit/29b643046e272528a231a712f5a45319424310cb))
- **deps:** update dependency tsdown to v0.23.4 ([#1629](https://github.com/miniapp-tool/mptool/issues/1629)) ([05e8116](https://github.com/miniapp-tool/mptool/commit/05e811699ec669b0cf7acca892c43360a50c1b92))
- **deps:** update dependency vue to v3.5.42 ([#1433](https://github.com/miniapp-tool/mptool/issues/1433)) ([bb05e87](https://github.com/miniapp-tool/mptool/commit/bb05e87eba96923cc47006e10b17fb8bf7c14b57))
- **deps:** update dependency vue to v3.5.43 ([#1444](https://github.com/miniapp-tool/mptool/issues/1444)) ([df6f73a](https://github.com/miniapp-tool/mptool/commit/df6f73ace5b21c7aa49668faeb4f488d75f8bde0))
- **deps:** update dependency vue to v3.5.44 ([#1467](https://github.com/miniapp-tool/mptool/issues/1467)) ([f68e0ef](https://github.com/miniapp-tool/mptool/commit/f68e0ef009b91fbc3914d08d0950ddc5962a3c7b))
- **deps:** update lerna-lite monorepo to v5.6.1 ([#1432](https://github.com/miniapp-tool/mptool/issues/1432)) ([d07bd0f](https://github.com/miniapp-tool/mptool/commit/d07bd0f9c94529e355b877958d66c337c0a0b038))
- **deps:** update lerna-lite monorepo to v5.6.2 ([#1450](https://github.com/miniapp-tool/mptool/issues/1450)) ([1acb196](https://github.com/miniapp-tool/mptool/commit/1acb196bd6a3ac05583e8959698c0e8a6e9c61ea))
- **deps:** update lerna-lite monorepo to v5.6.3 ([#1468](https://github.com/miniapp-tool/mptool/issues/1468)) ([f0aee7d](https://github.com/miniapp-tool/mptool/commit/f0aee7db1214319585ac091a5c631f50e2fefa90))
- **deps:** update lockfile ([#1307](https://github.com/miniapp-tool/mptool/issues/1307)) ([f0e646a](https://github.com/miniapp-tool/mptool/commit/f0e646adf913a02b7f4b84472846db832b86c9ee))
- **deps:** update lockfile ([#1589](https://github.com/miniapp-tool/mptool/issues/1589)) ([40b50f9](https://github.com/miniapp-tool/mptool/commit/40b50f95cf6604920a0ed63cc42871fd42b8dfd3))
- **deps:** update vitest monorepo to v4.1.11 ([#1428](https://github.com/miniapp-tool/mptool/issues/1428)) ([2d9b095](https://github.com/miniapp-tool/mptool/commit/2d9b095612b705041dda42269c0bd14e27a96b69))
- **deps:** update vitest monorepo to v5 ([#1438](https://github.com/miniapp-tool/mptool/issues/1438)) ([907de46](https://github.com/miniapp-tool/mptool/commit/907de4676b9f47f152a3eebfcfb062f1cefb0721))
- **deps:** update vitest monorepo to v5.0.1 ([#1445](https://github.com/miniapp-tool/mptool/issues/1445)) ([bc29cb7](https://github.com/miniapp-tool/mptool/commit/bc29cb74e06622a71d18c3643667a0c4e68aaa09))
- **deps:** update vitest monorepo to v5.0.2 ([#1451](https://github.com/miniapp-tool/mptool/issues/1451)) ([c7f7a3d](https://github.com/miniapp-tool/mptool/commit/c7f7a3db20c10576db2bf494c2772b6545167a15))
- **deps:** update vitest monorepo to v5.0.3 ([#1458](https://github.com/miniapp-tool/mptool/issues/1458)) ([ca7ed4e](https://github.com/miniapp-tool/mptool/commit/ca7ed4eac9b440433d82c77f7fda9d039013339c))
- **deps:** update vitest monorepo to v5.0.5 ([#1469](https://github.com/miniapp-tool/mptool/issues/1469)) ([63c50b8](https://github.com/miniapp-tool/mptool/commit/63c50b83395679ba0470ae686e9b203be36ea970))
- **deps:** upgrade dependencies and pnpm to v12.15.0 ([7e04438](https://github.com/miniapp-tool/mptool/commit/7e04438aa85d3998cdeabb47a7d32a53266d2f6b))
- **enhance:** align skyline-enhance drift and cover slim behaviours ([#1516](https://github.com/miniapp-tool/mptool/issues/1516)) ([ca12980](https://github.com/miniapp-tool/mptool/commit/ca129802b76dc9c0d2c86e093b2608c1e179162b))
- harden CI workflows and drop the two broken root scripts ([#1568](https://github.com/miniapp-tool/mptool/issues/1568)) ([aee9848](https://github.com/miniapp-tool/mptool/commit/aee9848de17019fc23ea462f9105c0cfe36fad9c))
- ignore the agent skill directory in lint and format ([daef8ce](https://github.com/miniapp-tool/mptool/commit/daef8cece4e622894b125d9beccb4294c4a11e7e))
- **run:** remove a leftover debug log from function hoisting ([#1599](https://github.com/miniapp-tool/mptool/issues/1599)) ([03bf9f1](https://github.com/miniapp-tool/mptool/commit/03bf9f1a404d81d8a2efae4061082cbb087a026f))

### Code Refactoring

- **all:** correct description ([706eba2](https://github.com/miniapp-tool/mptool/commit/706eba27427caed8472587f5044e0efd233e58ab))
- drop QQ mini-program support ([#1498](https://github.com/miniapp-tool/mptool/issues/1498)) ([f6e43c1](https://github.com/miniapp-tool/mptool/commit/f6e43c155ed6f1fe7b843d460ba458eef2429981))
- **encoder:** drop unreachable branches and document spec guards ([#1615](https://github.com/miniapp-tool/mptool/issues/1615)) ([1788a79](https://github.com/miniapp-tool/mptool/commit/1788a791e8a93cb0436b646774a094a4c459db74))
- **encoder:** freeze the codec registries and drop a dead constructor check ([#1565](https://github.com/miniapp-tool/mptool/issues/1565)) ([85009f1](https://github.com/miniapp-tool/mptool/commit/85009f1423d34aa63e29eab39e36aaf278a92986))
- **skyline-enhance:** remove enhance-only config options and dead app state ([#1557](https://github.com/miniapp-tool/mptool/issues/1557)) ([49b833e](https://github.com/miniapp-tool/mptool/commit/49b833e0face5b49b36b101ba080edd1b53e032b))

### Tests

- **all:** assert aggregated globals have no duplicate exports ([#1567](https://github.com/miniapp-tool/mptool/issues/1567)) ([ec243c9](https://github.com/miniapp-tool/mptool/commit/ec243c95cae36ad6f99bc62fedfb61a94fae0f2a))
- **all:** assert the bundle export surface matches the bundled packages ([#1573](https://github.com/miniapp-tool/mptool/issues/1573)) ([a9fbb8b](https://github.com/miniapp-tool/mptool/commit/a9fbb8be2acf295dd93ef8592acc176de2c88773))
- **all:** cover the bundle re-export surfaces ([#1622](https://github.com/miniapp-tool/mptool/issues/1622)) ([6e777e3](https://github.com/miniapp-tool/mptool/commit/6e777e383e91b1cb5c5d38984b9956c560fb4d9e))
- always emit a JUnit report in CI ([#1484](https://github.com/miniapp-tool/mptool/issues/1484)) ([a3664ae](https://github.com/miniapp-tool/mptool/commit/a3664ae6097edb50e3e07eb99529a9a0c0fd480d))
- **api:** raise coverage to 100% ([#1609](https://github.com/miniapp-tool/mptool/issues/1609)) ([1b997c1](https://github.com/miniapp-tool/mptool/commit/1b997c1027338e9ebc7123b2c183609b2e3009d6))
- **encoder:** raise coverage to 97.36% statements and 93.65% branches ([#1611](https://github.com/miniapp-tool/mptool/issues/1611)) ([135f8a5](https://github.com/miniapp-tool/mptool/commit/135f8a546d1b17e59d5ec2e05d1a670315050728))
- **enhance:** raise coverage to 100% on statements, branches, functions and lines ([#1619](https://github.com/miniapp-tool/mptool/issues/1619)) ([2f8faa5](https://github.com/miniapp-tool/mptool/commit/2f8faa5a0318cfdc2037f9bd4602e44091350ad1))
- **file:** raise coverage to 100% ([#1612](https://github.com/miniapp-tool/mptool/issues/1612)) ([1b39745](https://github.com/miniapp-tool/mptool/commit/1b3974517cbb740efd0d905b8f72709034a973f5))
- **file:** widen the storage expiry margins against slow CI ([#1555](https://github.com/miniapp-tool/mptool/issues/1555)) ([ef1cc95](https://github.com/miniapp-tool/mptool/commit/ef1cc953c60365fab0585c72e2ae36ae31f540a7))
- make pnpm test self-contained by building missing workspace output ([#1562](https://github.com/miniapp-tool/mptool/issues/1562)) ([69fedb9](https://github.com/miniapp-tool/mptool/commit/69fedb975e1ca8cc236ab090ffae15049b79339f))
- **mock:** reach 100% coverage ([#1621](https://github.com/miniapp-tool/mptool/issues/1621)) ([4125224](https://github.com/miniapp-tool/mptool/commit/41252249e2db04aba4c2548ad233f343c5260b92))
- **net:** raise @mptool/net coverage to 100% ([#1614](https://github.com/miniapp-tool/mptool/issues/1614)) ([473abfa](https://github.com/miniapp-tool/mptool/commit/473abfa5c09a7d1d146532726444c4a0986f6328))
- **parser:** reach 100% coverage ([#1617](https://github.com/miniapp-tool/mptool/issues/1617)) ([b372a25](https://github.com/miniapp-tool/mptool/commit/b372a25376fa50c0b86585354c19add4f64e7dac))
- **run:** fix oxlint prefer-string-raw warnings ([41f8b85](https://github.com/miniapp-tool/mptool/commit/41f8b8586b78c21f2062685023a6cebf5325ee4d))
- **run:** organize interpreter regression specs by topic ([#1532](https://github.com/miniapp-tool/mptool/issues/1532)) ([6049e44](https://github.com/miniapp-tool/mptool/commit/6049e440b136576198b804374522c33de7e69493))
- **run:** reach 100% coverage for statements, branches, functions and lines ([#1623](https://github.com/miniapp-tool/mptool/issues/1623)) ([ca8c165](https://github.com/miniapp-tool/mptool/commit/ca8c1659240461defc329132c2eb050328aaa7e5))
- **shared:** raise coverage to 100% ([#1618](https://github.com/miniapp-tool/mptool/issues/1618)) ([af26977](https://github.com/miniapp-tool/mptool/commit/af269776ba2b84ff171bcf4c28cc2cc63e8431e2))
- silence expected error logs in test output ([#1590](https://github.com/miniapp-tool/mptool/issues/1590)) ([ae60e9f](https://github.com/miniapp-tool/mptool/commit/ae60e9f9a039b5e1b798eb1d0b071366d0e0826a))
- **skyline-enhance:** raise coverage to 100% statements / 99.35% branches ([#1626](https://github.com/miniapp-tool/mptool/issues/1626)) ([7d41f9b](https://github.com/miniapp-tool/mptool/commit/7d41f9bcb66b51d61c59be2ca823620dda0a60b1))

### Build System

- bump deps ([afbdfc0](https://github.com/miniapp-tool/mptool/commit/afbdfc0a2e5aaefb10da536c08e36f4a3c66ad2d))
- bump deps ([636a113](https://github.com/miniapp-tool/mptool/commit/636a113b6abb011973e599b694d3fc0dc6e50d6c))
- emit single-file ESM bundles for every package ([#1636](https://github.com/miniapp-tool/mptool/issues/1636)) ([a71a78b](https://github.com/miniapp-tool/mptool/commit/a71a78b16a5ac03d03a6d88522d389675ef5a1a8))
- enable isolatedDeclarations ([a763fc6](https://github.com/miniapp-tool/mptool/commit/a763fc66e994f565fe6b3bdeac0333d025a29ee9))
- keep encoder codecs when bundling on Windows ([#1477](https://github.com/miniapp-tool/mptool/issues/1477)) ([70e4fa6](https://github.com/miniapp-tool/mptool/commit/70e4fa6cda14676993e6a6a0ff9986263d7fda82))
- polyfill Object.hasOwn in every JS bundle ([#1638](https://github.com/miniapp-tool/mptool/issues/1638)) ([78cb049](https://github.com/miniapp-tool/mptool/commit/78cb049975a7605a57f41f1fe5b2213f4ef06240))
- update config and bump deps ([8faef2d](https://github.com/miniapp-tool/mptool/commit/8faef2d5f19eb87c1d668dd59154752fdc3b4ec5))
- upload bundle sizes to Codecov and drop the unused buffer dep ([#1507](https://github.com/miniapp-tool/mptool/issues/1507)) ([bc2c09d](https://github.com/miniapp-tool/mptool/commit/bc2c09d9f2edc90381a90690f2c8262de7456fb0))

### Continuous Integration

- add a type-check gate ([#1503](https://github.com/miniapp-tool/mptool/issues/1503)) ([62f077b](https://github.com/miniapp-tool/mptool/commit/62f077bfafe0715121d29445d74dce3c72351283))
- block publish-only retries outside main ([#1485](https://github.com/miniapp-tool/mptool/issues/1485)) ([cb6a3ae](https://github.com/miniapp-tool/mptool/commit/cb6a3ae0fcd385699851128303b323f95cacae3b))
- correct workflow permission comments ([#1676](https://github.com/miniapp-tool/mptool/issues/1676)) ([26bd06f](https://github.com/miniapp-tool/mptool/commit/26bd06f0bf7838997b6a740c7d48f63af6849ca4))
- **demo:** raise demo base library and drop invalid switchTab demo ([#1660](https://github.com/miniapp-tool/mptool/issues/1660)) ([1be9cb2](https://github.com/miniapp-tool/mptool/commit/1be9cb24a5ce2db160553aedb906b42eba26155c))
- do not cancel test runs on main ([#1613](https://github.com/miniapp-tool/mptool/issues/1613)) ([3350eaa](https://github.com/miniapp-tool/mptool/commit/3350eaa8597109b9ce99d637fa1484ffc3172dce))
- enforce 100% coverage thresholds ([#1558](https://github.com/miniapp-tool/mptool/issues/1558)) ([1e0fcd6](https://github.com/miniapp-tool/mptool/commit/1e0fcd6f0a62dc5332dc96a94f38004d544e0f94))
- install dependencies once, with a frozen lockfile ([#1635](https://github.com/miniapp-tool/mptool/issues/1635)) ([8b8c6d7](https://github.com/miniapp-tool/mptool/commit/8b8c6d72bbfcf7d506034222fc46998e3698bf15))
- **publish:** gate releases on enhance sync and a clean build ([#1637](https://github.com/miniapp-tool/mptool/issues/1637)) ([b14b51b](https://github.com/miniapp-tool/mptool/commit/b14b51b0a26d2543c62215ae357ef925afc35ad3))
- run workflows on Node 26 LTS ([#1675](https://github.com/miniapp-tool/mptool/issues/1675)) ([795396f](https://github.com/miniapp-tool/mptool/commit/795396f9d7392b53398072f68fc96108c5f396a0))
- scope Renovate automerge to patch/minor devDependencies ([#1616](https://github.com/miniapp-tool/mptool/issues/1616)) ([e8bf20b](https://github.com/miniapp-tool/mptool/commit/e8bf20b2256bc1fb1b21593e813792c30694d9be))
- scope workflow permissions to the publish job and add release guardrails ([#1543](https://github.com/miniapp-tool/mptool/issues/1543)) ([a634253](https://github.com/miniapp-tool/mptool/commit/a634253e5627c277937bf5f62f556ebd25702f23))
- type-check the demo in the build gate and check docs on pull requests ([#1549](https://github.com/miniapp-tool/mptool/issues/1549)) ([84d1e86](https://github.com/miniapp-tool/mptool/commit/84d1e8666c79acbe55acf8927924378c1b15e5f6))
- use non-vulnerable Node releases ([#1474](https://github.com/miniapp-tool/mptool/issues/1474)) ([09af93d](https://github.com/miniapp-tool/mptool/commit/09af93d65a97fd559b4e83d3634301cd086b711f))
- use the read-only lint script in PR CI ([#1483](https://github.com/miniapp-tool/mptool/issues/1483)) ([ee199a4](https://github.com/miniapp-tool/mptool/commit/ee199a422dcbbc606418692610363e0a59253fe7))
- verify the enhance → skyline-enhance sync and build reproducibility ([#1556](https://github.com/miniapp-tool/mptool/issues/1556)) ([be5a5ca](https://github.com/miniapp-tool/mptool/commit/be5a5ca80e1cbb3abe6fa0aaabb2a88e04e3367e))

## [0.19.0](https://github.com/miniapp-tool/mptool/compare/v0.18.1...v0.19.0) (2026-08-17)

### ✨ Features

- **api:** export withScope permission helper ([987bc86](https://github.com/miniapp-tool/mptool/commit/987bc86890576a84bff27d514ae394487767892d))

### 🐛 Bug Fixes

- **shared:** remove misplaced pure annotation in env ([c35138e](https://github.com/miniapp-tool/mptool/commit/c35138e527e1d1870d21203225acac8299c783ea))

### Styles

- fix linter ([0a59cdd](https://github.com/miniapp-tool/mptool/commit/0a59cdd1a0e7ba763d307986e8e68da3379b1878))

### Miscellaneous Chores

- **deps:** update commitlint monorepo to v21.2.2 ([#1420](https://github.com/miniapp-tool/mptool/issues/1420)) ([ea2738a](https://github.com/miniapp-tool/mptool/commit/ea2738ad6c101d2585a1b4d62d36d4264deb92cb))
- **deps:** update dependency conventional-changelog-conventionalcommits to v10.3.0 ([#1422](https://github.com/miniapp-tool/mptool/issues/1422)) ([dacee9a](https://github.com/miniapp-tool/mptool/commit/dacee9a3b63f73293ba97d9c5bfdbbf79bcbc82f))
- **deps:** update dependency oxfmt to v0.63.0 ([#1423](https://github.com/miniapp-tool/mptool/issues/1423)) ([e48b0fc](https://github.com/miniapp-tool/mptool/commit/e48b0fcae9fe6a89bb567ac69b95f6a597afa6b8))
- **deps:** update dependency sass-embedded to v1.102.0 ([#1425](https://github.com/miniapp-tool/mptool/issues/1425)) ([50e081f](https://github.com/miniapp-tool/mptool/commit/50e081fae82a2572d9e00b2f24b0acd1e63d12a8))
- **deps:** update lerna-lite monorepo to v5.5.0 ([#1426](https://github.com/miniapp-tool/mptool/issues/1426)) ([20fdfb9](https://github.com/miniapp-tool/mptool/commit/20fdfb97b3546f595a2bfdc607755e74e1a02f19))

## [0.18.1](https://github.com/miniapp-tool/mptool/compare/v0.18.0...v0.18.1) (2026-08-12)

### 🐛 Bug Fixes

- **run:** use strict ASCII identifier names for device compatibility ([728a3b5](https://github.com/miniapp-tool/mptool/commit/728a3b53ddbd275846b82824e88ba36d4756691c))

### Build System

- fix sync scripts ([cf4c613](https://github.com/miniapp-tool/mptool/commit/cf4c6135b37eecc11a7016ca07a4f0237a6fd224))

## [0.18.0](https://github.com/miniapp-tool/mptool/compare/v0.17.2...v0.18.0) (2026-08-12)

### ✨ Features

- **enhance:** add onHotReload hook to page hot reload ([16a8691](https://github.com/miniapp-tool/mptool/commit/16a86915a57b75a833d280989022ae4cb09c8c1b))

### Documentation

- correct nginx ([b906563](https://github.com/miniapp-tool/mptool/commit/b90656353a21aae4ccd3e0579899bf0208ab5e73))

### Miscellaneous Chores

- **release:** update publish workflow and fix npmmirror sync ([02a39fc](https://github.com/miniapp-tool/mptool/commit/02a39fc4f4f4adcd9c241055d4b208c5daa7d44e))

## [0.17.2](https://github.com/miniapp-tool/mptool/compare/v0.17.1...v0.17.2) (2026-08-10)

### 🐛 Bug Fixes

- **enhance:** skip empty hot reload responses ([14cdff7](https://github.com/miniapp-tool/mptool/commit/14cdff74da86258d9a82a6c51c662481feb7e15f))

### Documentation

- **enhance:** add hot reload nginx deployment note ([d22921b](https://github.com/miniapp-tool/mptool/commit/d22921b7ab2d3c0eba937a06e7fc267e651c0750))

## [0.17.1](https://github.com/miniapp-tool/mptool/compare/v0.17.0...v0.17.1) (2026-08-10)

### 🐛 Bug Fixes

- **run:** fix miniprogram packing ([30f5a20](https://github.com/miniapp-tool/mptool/commit/30f5a20b39424c7dcf20397469d79da4c342526e))

## [0.17.0](https://github.com/miniapp-tool/mptool/compare/v0.16.3...v0.17.0) (2026-08-10)

### ✨ Features

- **run:** add @mptool/run package ([#1415](https://github.com/miniapp-tool/mptool/issues/1415)) ([0c284fb](https://github.com/miniapp-tool/mptool/commit/0c284fbe4cc4271c6d6e31d52cb4e3336b6df05c))
- **skyline-enhance:** sync hot reload and global helpers ([f9af895](https://github.com/miniapp-tool/mptool/commit/f9af895786e58a692aec6881cd52d8e50dcf8aed))

### Documentation

- update CLAUDE ([948a4cb](https://github.com/miniapp-tool/mptool/commit/948a4cb27ddb1e7b9a91142acc324012736a53d1))

### Miscellaneous Chores

- **deps:** update dependency vue to v3.5.41 ([#1418](https://github.com/miniapp-tool/mptool/issues/1418)) ([1026ab1](https://github.com/miniapp-tool/mptool/commit/1026ab1793a58eb95549e84f043c78bbe4ef83d7))

### Build System

- bump deps ([66737b6](https://github.com/miniapp-tool/mptool/commit/66737b6c01a164bbf5597cb7a01db44460df20d6))

## [0.16.3](https://github.com/miniapp-tool/mptool/compare/v0.16.2...v0.16.3) (2026-08-06)

### 🐛 Bug Fixes

- **build:** inject atob polyfill for miniapp environments ([#1414](https://github.com/miniapp-tool/mptool/issues/1414)) ([04d55b3](https://github.com/miniapp-tool/mptool/commit/04d55b317f3d6559637796c7b4d0d1c2fed96c27))

## [0.16.2](https://github.com/miniapp-tool/mptool/compare/v0.16.1...v0.16.2) (2026-08-06)

### Build System

- lower tsdown target from es2021 to es2018 ([#1413](https://github.com/miniapp-tool/mptool/issues/1413)) ([137ca82](https://github.com/miniapp-tool/mptool/commit/137ca8224b92664dde170609b15dcb2540b1eba3)), references [#1412](https://github.com/miniapp-tool/mptool/issues/1412)

## [0.16.1](https://github.com/miniapp-tool/mptool/compare/v0.16.0...v0.16.1) (2026-08-06)

### Code Refactoring

- **all:** bundle from workspace src to dedupe shared ([#1411](https://github.com/miniapp-tool/mptool/issues/1411)) ([cfafa4c](https://github.com/miniapp-tool/mptool/commit/cfafa4cbf8ae508e6b7d5130ae4cbee7981152a1))
- **api:** extract the shared permission flow into withScope ([#1410](https://github.com/miniapp-tool/mptool/issues/1410)) ([bb9bfd6](https://github.com/miniapp-tool/mptool/commit/bb9bfd653a1067edd6aff262d1aa2ba2b063bff2))
- **encoder:** pack the gb18030 index table as base64 Uint16Array ([#1408](https://github.com/miniapp-tool/mptool/issues/1408)) ([5ee2057](https://github.com/miniapp-tool/mptool/commit/5ee20571c39bcecfe0f8e87c81575c905cb76781))
- **enhance:** stop re-exporting all of shared, keep all's full surface ([#1409](https://github.com/miniapp-tool/mptool/issues/1409)) ([58254ab](https://github.com/miniapp-tool/mptool/commit/58254ab9c9e88f7e599eb36c51408c694854161e))
- **parser:** replace cheerio with htmlparser2 and dom-serializer ([#1407](https://github.com/miniapp-tool/mptool/issues/1407)) ([a5a47fa](https://github.com/miniapp-tool/mptool/commit/a5a47fadaa87e572302c4574dadc4d2e94a85d07))

### Build System

- raise tsdown target from es2017 to es2021 to dedup helpers ([#1412](https://github.com/miniapp-tool/mptool/issues/1412)) ([a27a71a](https://github.com/miniapp-tool/mptool/commit/a27a71a2144998a1d9c9feaae8bb2b8394c8d6f8))

## [0.16.0](https://github.com/miniapp-tool/mptool/compare/v0.15.0...v0.16.0) (2026-08-06)

### ✨ Features

- **parser:** append full links to anchor text ([c089c36](https://github.com/miniapp-tool/mptool/commit/c089c36a63f1a3ea023eb036616796ca1017bc58))
- **parser:** insert line breaks between blocks in getText ([b509a84](https://github.com/miniapp-tool/mptool/commit/b509a84b334d5bf3534a3d33cc56d680dce7e2c3))

### 🐛 Bug Fixes

- **api:** avoid duplicating the extension in saveDocument ([f1a4fae](https://github.com/miniapp-tool/mptool/commit/f1a4fae3ea30ff103f80d9092b5eddfe831dfd64))
- **api:** reject on wx api failures in addContact and savePhoto ([d4f670f](https://github.com/miniapp-tool/mptool/commit/d4f670f727b9c83699e819c31345b8876c4192ce))
- **api:** scale wifi signal threshold by platform ([83b6ed0](https://github.com/miniapp-tool/mptool/commit/83b6ed04df52c3a85190291428bda517150c31a9))
- **api:** strip query and hash from the url when deriving the file name ([7da364e](https://github.com/miniapp-tool/mptool/commit/7da364e85639db7f1e93d484efeade12b9ee9583))
- **encoder:** align gb18030 index with the WHATWG spec ([6389640](https://github.com/miniapp-tool/mptool/commit/6389640e773d453732dd7c2e042fd3346ae4644a))
- **encoder:** keep decoder registration from being tree-shaken ([c844fe0](https://github.com/miniapp-tool/mptool/commit/c844fe0185f57f1589617c8175f87a2d3b135a9d))
- **enhance:** hold the navigate lock until the page transition completes ([cadc96a](https://github.com/miniapp-tool/mptool/commit/cadc96a008e3bda7374f80eacaaeb327cf5f516f))
- **enhance:** isolate onAwake listeners per page instance ([7315ce1](https://github.com/miniapp-tool/mptool/commit/7315ce19d7e6260f6eb9bd388022299a17ff12fb))
- **enhance:** normalize page path for onNavigate/onPreload event keys ([27fbd85](https://github.com/miniapp-tool/mptool/commit/27fbd854ebbe2a410931c26f65713fcc85d1fe32))
- **enhance:** skip navigateBack when already at the first page ([3ec5b78](https://github.com/miniapp-tool/mptool/commit/3ec5b785771848f1a49f486fe3c79d1cf2069a83))
- **enhance:** strip query from the wx.switchTab url ([654cc7c](https://github.com/miniapp-tool/mptool/commit/654cc7c9c1ec6e1ad317b0722ea0e624829d822c))
- **file:** create the parent directory in saveFile ([1c0b812](https://github.com/miniapp-tool/mptool/commit/1c0b8129542696389f63bd1e97a983c2192e292e))
- **file:** log original errors and skip undefined writes ([9aad1bf](https://github.com/miniapp-tool/mptool/commit/9aad1bf5bd0d3d9cb7791887014536b62b9dd8dd))
- **file:** skip undefined writes in setAsync for keep expiry ([93e39e6](https://github.com/miniapp-tool/mptool/commit/93e39e657c10dc97c302a38febb1a20c9486e85a))
- **mock:** make select query exec result match node count ([1fe6f75](https://github.com/miniapp-tool/mptool/commit/1fe6f7574c1e8600e3f1e832dc993977cb91eb22))
- **mock:** trigger complete callback in storage async apis ([3847a18](https://github.com/miniapp-tool/mptool/commit/3847a18e103e19ee86e08c31746c95a94f3ed42e))
- **net:** clear both legacy and normalized cookie keys ([3a9a260](https://github.com/miniapp-tool/mptool/commit/3a9a260d629b26f53a4435b70d44b1a7d4a3fc97))
- **net:** decode URLSearchParams leniently like the native API ([58adf3c](https://github.com/miniapp-tool/mptool/commit/58adf3cba21587f13292565a91b618d81069c228))
- **net:** keep NUL encoded as %00 in URLSearchParams ([1795bca](https://github.com/miniapp-tool/mptool/commit/1795bca2e8d95602aea95c414f77e9cbdcc1a00f))
- **net:** normalize cookie domain across all write paths ([6a7030a](https://github.com/miniapp-tool/mptool/commit/6a7030aa12d4ed221d89ec5412e64912671e2f07))
- **net:** normalize leading/trailing whitespace in header values ([1b92d3a](https://github.com/miniapp-tool/mptool/commit/1b92d3a1954e65e8808c4c88e08c5d10dd6a2a5b))
- **net:** rewrite URLSearchParams to align with native behavior ([8b9379e](https://github.com/miniapp-tool/mptool/commit/8b9379e17bb9d9c12cd736965c2dd11a8d799ad3))
- **net:** treat invalid cookie expiry as session and parse protocol-relative urls ([5f5c496](https://github.com/miniapp-tool/mptool/commit/5f5c496193e85a3a581801f8087e56ee3c033165))
- **parser:** drop invalid marker camel-case svg attrs ([b5a390b](https://github.com/miniapp-tool/mptool/commit/b5a390b93f683ec84949c44d31ffa20d206a4d5f))
- **parser:** restore svg camel case attrs and fix data uri encoding ([d9c8720](https://github.com/miniapp-tool/mptool/commit/d9c872007ff0ae8af7e6242d2d6371b54a6aa083))
- **shared:** honor DEBUG flag in logger.debug and fix js error level ([2f9c40b](https://github.com/miniapp-tool/mptool/commit/2f9c40bc86d26622bdf123b69adc38e5f5d06c15))
- **shared:** keep emitting when a handler throws or rejects ([9c456ee](https://github.com/miniapp-tool/mptool/commit/9c456ee1b8385be3785a2e9cf174184408340238))
- **shared:** parse valueless query keys and avoid stuck lock/queue ([39677b1](https://github.com/miniapp-tool/mptool/commit/39677b17c2aa825c1ea4ff06a75dc05e4195356a))

### Documentation

- align documentation with the actual API implementation ([13f9fd1](https://github.com/miniapp-tool/mptool/commit/13f9fd176ee2619629e42c578d895d44f8ce3744))
- rewrite AGENTS.md to reflect current project state ([12310a7](https://github.com/miniapp-tool/mptool/commit/12310a76d53db3b3ed55f8304788c7aa3fe43f04))

### Code Refactoring

- **api:** simplify saveDocument file name derivation ([f68c714](https://github.com/miniapp-tool/mptool/commit/f68c714dead92349bf9d6bf107bd372540fee6b8))
- **net:** drop legacy cookie key compatibility ([2d0c3f4](https://github.com/miniapp-tool/mptool/commit/2d0c3f47d42209f720cc2b9bb0da75496626ef5c))

## [0.15.0](https://github.com/miniapp-tool/mptool/compare/v0.14.0...v0.15.0) (2026-08-05)

### ✨ Features

- improve mock ([e2dc48e](https://github.com/miniapp-tool/mptool/commit/e2dc48ed15151c879f247ad089b5e7560e64b27d))
- **mock:** add new api ([98bdc1f](https://github.com/miniapp-tool/mptool/commit/98bdc1f14b437260909b18fb8afe96c1dd175d88))
- **mock:** cover more common wx apis ([c066bfc](https://github.com/miniapp-tool/mptool/commit/c066bfc4352587f06f088f66ea6cd4b8b4970139))
- **mock:** improve api mock ([93414ae](https://github.com/miniapp-tool/mptool/commit/93414ae41dbd5d0f4db8795037916f5c2a1addef))
- sync enhance ([d071553](https://github.com/miniapp-tool/mptool/commit/d07155340cf7bae6ef3a28431314224c347ef119))

### 🐛 Bug Fixes

- **api:** handle 4g/5g as healthy network in reportNetworkStatus ([9175666](https://github.com/miniapp-tool/mptool/commit/9175666d33cc2b27ff7f3deb8a5aefbf4a6fb492))
- **enhance:** clamp back delta when no home is configured ([47c8e59](https://github.com/miniapp-tool/mptool/commit/47c8e59c9ff9f94ec868308dd4924e978a4bda91))
- **enhance:** release navigation lock when onNavigate handler throws ([c1e6055](https://github.com/miniapp-tool/mptool/commit/c1e60557825dc421379b141ead78a835f0e66796))
- **enhance:** support dynamically setting component ref ([fc29fe4](https://github.com/miniapp-tool/mptool/commit/fc29fe4ab83df51c1f0b3b8d411402563437eb87))
- **enhance:** unregister onAwake listener on page unload ([c418639](https://github.com/miniapp-tool/mptool/commit/c41863997366cc52f5dc43a6ab793f27655378a3))
- **file:** correct error log in getAsync ([3dc915f](https://github.com/miniapp-tool/mptool/commit/3dc915fe1ce089a50aa56efdc88131165f63a8bb))
- **file:** keep permanent cache in check() and checkAsync() ([50436a9](https://github.com/miniapp-tool/mptool/commit/50436a96d69c9f5ce90b2e5eecf827250bce5256))
- **file:** lazily initialize file system manager to avoid import crash ([b11bb5b](https://github.com/miniapp-tool/mptool/commit/b11bb5bb40c81973c5ec822ec5043de97a761db4))
- **file:** read filePath result in saveOnlineFile ([ed81140](https://github.com/miniapp-tool/mptool/commit/ed811400e63e7702fd11d9ba992a054d0ebebbce))
- **mock:** align FileSystemManager signatures with wx api ([6e1f8df](https://github.com/miniapp-tool/mptool/commit/6e1f8dff6326234576e67a373919c043cad7ebaa))
- **mock:** correct limitSize to 10MB in storage info ([2b635a3](https://github.com/miniapp-tool/mptool/commit/2b635a32aacb90efcfe67776a6d88863f6dca380))
- **mock:** return filePath when downloadFile receives filePath ([eb24b63](https://github.com/miniapp-tool/mptool/commit/eb24b63c8d5eadece02ee6d580c588c31699bf97))
- **mock:** return full WifiInfo in getConnectedWifi ([ea6925d](https://github.com/miniapp-tool/mptool/commit/ea6925d934f49f95af3663bfa91e46bb235ad693))
- **mock:** return singleton FileSystemManager ([ae07258](https://github.com/miniapp-tool/mptool/commit/ae072588654b910249b98075bc542e24224fb72f))
- **net:** correct cookie scope for repeated labels and bind forEach once ([64f559f](https://github.com/miniapp-tool/mptool/commit/64f559fc2100a08a7a3446742b731b7c55bc8a61))
- **net:** match cookie path at segment boundary ([14d1e01](https://github.com/miniapp-tool/mptool/commit/14d1e014d740656b4a81175dadd81e68d2dcf62e))
- **net:** preserve duplicate values in URLSearchParams[#values](https://github.com/miniapp-tool/mptool/issues/values) ([1663942](https://github.com/miniapp-tool/mptool/commit/166394207da2335bb6533191cbffc7e8214ae354))
- **parser:** preserve viewBox casing in svg conversion ([27dfc67](https://github.com/miniapp-tool/mptool/commit/27dfc6726339bbd8064f6a20f3a9976d0d11f0f8))
- **shared:** guard wx.env access in logger.debug on js environment ([94faf1d](https://github.com/miniapp-tool/mptool/commit/94faf1d3eb10d3d0d65cd9666fcae0f89628a529))
- **shared:** keep createQueue progressing when a task rejects ([2d191d7](https://github.com/miniapp-tool/mptool/commit/2d191d7636fde6b9bdae7a74eff92fbf7846f4b6))
- **shared:** skip empty segments in query.parse ([afd05c8](https://github.com/miniapp-tool/mptool/commit/afd05c81e860016740590182b52271784108047d))

### Documentation

- add mock usage guide with event trigger ([65be45c](https://github.com/miniapp-tool/mptool/commit/65be45c783c7d36f4e00deb315c5dc902792c773))

### Styles

- fix linter ([fd8a518](https://github.com/miniapp-tool/mptool/commit/fd8a5186716030cb8b87c568b43d8ec1c9efff4a))
- update linter ([6fd2652](https://github.com/miniapp-tool/mptool/commit/6fd2652bc5552ea57a5d1bcaa49b6f3067ce9fbb))

### Miscellaneous Chores

- allow Behavior in new-cap exceptions ([4ee603e](https://github.com/miniapp-tool/mptool/commit/4ee603e493d1ebf61a2ef2570c57229eb43da78d))
- **deps:** update actions/setup-node action to v7 ([#1393](https://github.com/miniapp-tool/mptool/issues/1393)) ([6b71dfd](https://github.com/miniapp-tool/mptool/commit/6b71dfd07e323ff44af49530eb063a20fa14038a))
- **deps:** update commitlint monorepo to v20.5.3 ([#1324](https://github.com/miniapp-tool/mptool/issues/1324)) ([433b5df](https://github.com/miniapp-tool/mptool/commit/433b5df31c5389ff0e33ea7fecb54c4c756b827c))
- **deps:** update commitlint monorepo to v21 ([#1337](https://github.com/miniapp-tool/mptool/issues/1337)) ([dee17a9](https://github.com/miniapp-tool/mptool/commit/dee17a9c0c24ef54e540e82a29caa47f9c92ee6d))
- **deps:** update commitlint monorepo to v21.0.2 ([#1347](https://github.com/miniapp-tool/mptool/issues/1347)) ([4b40e4f](https://github.com/miniapp-tool/mptool/commit/4b40e4fa2137929b82ce82904477dfeba6ca528e))
- **deps:** update commitlint monorepo to v21.1.0 ([#1370](https://github.com/miniapp-tool/mptool/issues/1370)) ([ea41bbd](https://github.com/miniapp-tool/mptool/commit/ea41bbd009d129e1fee51837e513aa02b05645d4))
- **deps:** update commitlint monorepo to v21.2.0 ([#1373](https://github.com/miniapp-tool/mptool/issues/1373)) ([f1903d4](https://github.com/miniapp-tool/mptool/commit/f1903d443ede201586638d536b34f39532bd6016))
- **deps:** update dependency @commitlint/cli to v20.5.2 ([#1322](https://github.com/miniapp-tool/mptool/issues/1322)) ([b5207bd](https://github.com/miniapp-tool/mptool/commit/b5207bdfb60350fa285bf060578b11b385ba8f00))
- **deps:** update dependency @commitlint/cli to v21.2.1 ([#1378](https://github.com/miniapp-tool/mptool/issues/1378)) ([5e85a22](https://github.com/miniapp-tool/mptool/commit/5e85a228838fde8e84109cf74bc27f70b27d91c2))
- **deps:** update dependency @mr-hope/tsconfig to v0.0.4 ([#1312](https://github.com/miniapp-tool/mptool/issues/1312)) ([e1758f1](https://github.com/miniapp-tool/mptool/commit/e1758f1003f6eaffed34ee7f1de1d6c839c2002d))
- **deps:** update dependency @types/node to v24.12.3 ([#1328](https://github.com/miniapp-tool/mptool/issues/1328)) ([1b556f1](https://github.com/miniapp-tool/mptool/commit/1b556f15f028b280b0ca7aa5385d0576fac346ec))
- **deps:** update dependency @types/node to v24.13.2 ([#1361](https://github.com/miniapp-tool/mptool/issues/1361)) ([d4ad39a](https://github.com/miniapp-tool/mptool/commit/d4ad39a60404840a21016734ae53da6f5ee8c124))
- **deps:** update dependency @types/node to v24.13.3 ([#1379](https://github.com/miniapp-tool/mptool/issues/1379)) ([156bd88](https://github.com/miniapp-tool/mptool/commit/156bd8839b0e83b08bcc79c3ec39a43ecfbdaf76))
- **deps:** update dependency @vuepress/plugin-meilisearch to v2.0.0-rc.130 ([#1339](https://github.com/miniapp-tool/mptool/issues/1339)) ([1f9b543](https://github.com/miniapp-tool/mptool/commit/1f9b543fadf95a316eac6f85d878a15195db74a1))
- **deps:** update dependency @vuepress/plugin-meilisearch to v2.0.0-rc.131 ([#1372](https://github.com/miniapp-tool/mptool/issues/1372)) ([092f61f](https://github.com/miniapp-tool/mptool/commit/092f61f7cb11dce6d38850a4d73372ca0ae2844a))
- **deps:** update dependency @vuepress/plugin-meilisearch to v2.0.0-rc.132 ([#1380](https://github.com/miniapp-tool/mptool/issues/1380)) ([b37ffe5](https://github.com/miniapp-tool/mptool/commit/b37ffe59d53799164c00756e3baacc92ee8aca01))
- **deps:** update dependency @vuepress/plugin-meilisearch to v2.0.0-rc.133 ([#1396](https://github.com/miniapp-tool/mptool/issues/1396)) ([4f47bc5](https://github.com/miniapp-tool/mptool/commit/4f47bc53e8a97e99658d496d042b857cf61c5bf7))
- **deps:** update dependency conventional-changelog-conventionalcommits to v10 ([#1371](https://github.com/miniapp-tool/mptool/issues/1371)) ([0c519dd](https://github.com/miniapp-tool/mptool/commit/0c519dd7a88978c52c08e7ea18e03b1fcc4cbdcd))
- **deps:** update dependency miniprogram-api-typings to v5.1.3 ([#1313](https://github.com/miniapp-tool/mptool/issues/1313)) ([2067f41](https://github.com/miniapp-tool/mptool/commit/2067f414e9b742f2661213494f84d902e1519f54))
- **deps:** update dependency miniprogram-api-typings to v5.2.0 ([#1333](https://github.com/miniapp-tool/mptool/issues/1333)) ([66df6b5](https://github.com/miniapp-tool/mptool/commit/66df6b588cc0acce001ee27e59d4124f16cf2273))
- **deps:** update dependency miniprogram-api-typings to v5.2.1 ([#1340](https://github.com/miniapp-tool/mptool/issues/1340)) ([3f9ecf5](https://github.com/miniapp-tool/mptool/commit/3f9ecf5eec8f12772baafddb430a6734f127fe04))
- **deps:** update dependency miniprogram-api-typings to v5.2.2 ([#1397](https://github.com/miniapp-tool/mptool/issues/1397)) ([7a20b1d](https://github.com/miniapp-tool/mptool/commit/7a20b1dd3756157d31871428479cff678506fe72))
- **deps:** update dependency oxc-config-hope to v0.3.12 ([#1399](https://github.com/miniapp-tool/mptool/issues/1399)) ([35caa55](https://github.com/miniapp-tool/mptool/commit/35caa55d024dc8a01ef0284941e99653cfdde34f))
- **deps:** update dependency oxc-config-hope to v0.3.6 ([#1348](https://github.com/miniapp-tool/mptool/issues/1348)) ([8650c8d](https://github.com/miniapp-tool/mptool/commit/8650c8d7f4caea053d87cdb8f967a77b269434fb))
- **deps:** update dependency oxc-config-hope to v0.3.9 ([#1367](https://github.com/miniapp-tool/mptool/issues/1367)) ([ac3342c](https://github.com/miniapp-tool/mptool/commit/ac3342cb886486501567a008d0bb5663145b3f3b))
- **deps:** update dependency oxfmt to v0.46.0 ([#1320](https://github.com/miniapp-tool/mptool/issues/1320)) ([9ac3fa4](https://github.com/miniapp-tool/mptool/commit/9ac3fa43afe4d246f0367ae19fcdeac02dc209d8))
- **deps:** update dependency oxfmt to v0.47.0 ([#1327](https://github.com/miniapp-tool/mptool/issues/1327)) ([d6dcdf7](https://github.com/miniapp-tool/mptool/commit/d6dcdf776df05da9d74b33492fbf068346c3797d))
- **deps:** update dependency oxfmt to v0.48.0 ([#1334](https://github.com/miniapp-tool/mptool/issues/1334)) ([c1fcc1f](https://github.com/miniapp-tool/mptool/commit/c1fcc1f230716ea5d1c46e527359d3c9b9bde1df))
- **deps:** update dependency oxfmt to v0.50.0 ([#1342](https://github.com/miniapp-tool/mptool/issues/1342)) ([dcbb5b5](https://github.com/miniapp-tool/mptool/commit/dcbb5b53672c7e3c4cdd16a4684090853f9d5184))
- **deps:** update dependency oxfmt to v0.51.0 ([#1344](https://github.com/miniapp-tool/mptool/issues/1344)) ([c8dcd85](https://github.com/miniapp-tool/mptool/commit/c8dcd85558c6673af2fbd1d9e368e5845b372bb3))
- **deps:** update dependency oxfmt to v0.52.0 ([#1352](https://github.com/miniapp-tool/mptool/issues/1352)) ([434f109](https://github.com/miniapp-tool/mptool/commit/434f109a11db1c113cb021e35a0331fe1e92ea11))
- **deps:** update dependency oxfmt to v0.53.0 ([#1355](https://github.com/miniapp-tool/mptool/issues/1355)) ([2f3e88e](https://github.com/miniapp-tool/mptool/commit/2f3e88e39def5903b58826f6a073b1e57ce5dd29))
- **deps:** update dependency oxfmt to v0.54.0 ([#1362](https://github.com/miniapp-tool/mptool/issues/1362)) ([cbe7a5c](https://github.com/miniapp-tool/mptool/commit/cbe7a5c3202a62e3bcdb54b6b2cbc64be62595ea))
- **deps:** update dependency oxfmt to v0.55.0 ([#1365](https://github.com/miniapp-tool/mptool/issues/1365)) ([5356ab9](https://github.com/miniapp-tool/mptool/commit/5356ab99aae6ce0367d499d75f7a4341ece03b60))
- **deps:** update dependency oxfmt to v0.57.0 ([#1374](https://github.com/miniapp-tool/mptool/issues/1374)) ([eef41f8](https://github.com/miniapp-tool/mptool/commit/eef41f8e41fb4387d7f8d3762dfaf40e86442f47))
- **deps:** update dependency oxfmt to v0.58.0 ([#1384](https://github.com/miniapp-tool/mptool/issues/1384)) ([d7a41ae](https://github.com/miniapp-tool/mptool/commit/d7a41aeea9b63054667269b84e53c5f9eff60e37))
- **deps:** update dependency oxfmt to v0.59.0 ([#1390](https://github.com/miniapp-tool/mptool/issues/1390)) ([3e3abef](https://github.com/miniapp-tool/mptool/commit/3e3abef9e9fdd4e7a12f77a03ede7b5e4fa71675))
- **deps:** update dependency oxfmt to v0.61.0 ([#1404](https://github.com/miniapp-tool/mptool/issues/1404)) ([c7b6d85](https://github.com/miniapp-tool/mptool/commit/c7b6d85179b41fef03f2ba58a3e4a3eedcb4e936))
- **deps:** update dependency oxlint to v1.72.0 ([#1375](https://github.com/miniapp-tool/mptool/issues/1375)) ([e31d356](https://github.com/miniapp-tool/mptool/commit/e31d3568f956965fc4c658b2b8738c4f16e4e09f))
- **deps:** update dependency oxlint to v1.73.0 ([#1385](https://github.com/miniapp-tool/mptool/issues/1385)) ([3b01bb1](https://github.com/miniapp-tool/mptool/commit/3b01bb1456fa0ab5ddf4ab3b30e87304ac210435))
- **deps:** update dependency oxlint to v1.74.0 ([#1391](https://github.com/miniapp-tool/mptool/issues/1391)) ([4ce6fc0](https://github.com/miniapp-tool/mptool/commit/4ce6fc0e37b5f9e673032ca901c7b2cfff54182a))
- **deps:** update dependency oxlint to v1.76.0 ([#1405](https://github.com/miniapp-tool/mptool/issues/1405)) ([fa89147](https://github.com/miniapp-tool/mptool/commit/fa89147c8aee6b32200f7887b9e1dc9a50dd5c52))
- **deps:** update dependency oxlint-tsgolint to v0.23.0 ([#1345](https://github.com/miniapp-tool/mptool/issues/1345)) ([ce340ba](https://github.com/miniapp-tool/mptool/commit/ce340ba02bf48cbbfbd918002c30ff481e1a7c29))
- **deps:** update dependency oxlint-tsgolint to v0.24.0 ([#1376](https://github.com/miniapp-tool/mptool/issues/1376)) ([ec6640d](https://github.com/miniapp-tool/mptool/commit/ec6640d6158f8659f6ba6f8ce0753f70740de650))
- **deps:** update dependency oxlint-tsgolint to v0.25.0 ([#1392](https://github.com/miniapp-tool/mptool/issues/1392)) ([1ff8f2c](https://github.com/miniapp-tool/mptool/commit/1ff8f2cd88cfaa4625421fec600b6483c25f927e))
- **deps:** update dependency oxlint-tsgolint to v7 ([#1406](https://github.com/miniapp-tool/mptool/issues/1406)) ([e224a14](https://github.com/miniapp-tool/mptool/commit/e224a14e89ff11ab293ebaaf5a8501cf7e2531a2))
- **deps:** update dependency publint to v0.3.20 ([#1330](https://github.com/miniapp-tool/mptool/issues/1330)) ([d748a5a](https://github.com/miniapp-tool/mptool/commit/d748a5a563180d591aea6ec166297566e9d41ae8))
- **deps:** update dependency publint to v0.3.22 ([#1400](https://github.com/miniapp-tool/mptool/issues/1400)) ([1fe2a9b](https://github.com/miniapp-tool/mptool/commit/1fe2a9b8b607d5a4732dcc40b247b953e228715b))
- **deps:** update dependency sass-embedded to v1.100.0 ([#1346](https://github.com/miniapp-tool/mptool/issues/1346)) ([ca13172](https://github.com/miniapp-tool/mptool/commit/ca1317219f2636341d8f25ae95f3bef3c308ee22))
- **deps:** update dependency set-cookie-parser to v3.1.1 ([#1368](https://github.com/miniapp-tool/mptool/issues/1368)) ([202928a](https://github.com/miniapp-tool/mptool/commit/202928aab8a05071f291dcb9b9273c56de2bec2f))
- **deps:** update dependency set-cookie-parser to v3.1.2 ([#1381](https://github.com/miniapp-tool/mptool/issues/1381)) ([6748649](https://github.com/miniapp-tool/mptool/commit/674864947e851dd56c54121ac30d4696caf48059))
- **deps:** update dependency tsdown to v0.21.10 ([#1315](https://github.com/miniapp-tool/mptool/issues/1315)) ([ba788d0](https://github.com/miniapp-tool/mptool/commit/ba788d00fdbb80812032a29f238244188ced44a5))
- **deps:** update dependency tsdown to v0.22.0 ([#1335](https://github.com/miniapp-tool/mptool/issues/1335)) ([99de663](https://github.com/miniapp-tool/mptool/commit/99de663f931acd88f518d6bcdce0e06c1052f150))
- **deps:** update dependency tsdown to v0.22.1 ([#1349](https://github.com/miniapp-tool/mptool/issues/1349)) ([7c102f8](https://github.com/miniapp-tool/mptool/commit/7c102f87a4b46394a75e3a65193bf6ed37c32d87))
- **deps:** update dependency tsdown to v0.22.12 ([#1394](https://github.com/miniapp-tool/mptool/issues/1394)) ([d5cab69](https://github.com/miniapp-tool/mptool/commit/d5cab69ea30683ea73e3200758dc1b27b46e9440))
- **deps:** update dependency tsdown to v0.22.14 ([#1401](https://github.com/miniapp-tool/mptool/issues/1401)) ([6f07a16](https://github.com/miniapp-tool/mptool/commit/6f07a1647c21a83d19450141c38a9624b8f57eba))
- **deps:** update dependency tsdown to v0.22.2 ([#1353](https://github.com/miniapp-tool/mptool/issues/1353)) ([60f94ee](https://github.com/miniapp-tool/mptool/commit/60f94ee0dde1a717e056aea85d0d1b663816fa5f))
- **deps:** update dependency tsdown to v0.22.3 ([#1363](https://github.com/miniapp-tool/mptool/issues/1363)) ([e3ef18a](https://github.com/miniapp-tool/mptool/commit/e3ef18a9099f511f22220dfb764dd79ac3d2c131))
- **deps:** update dependency tsdown to v0.22.5 ([#1382](https://github.com/miniapp-tool/mptool/issues/1382)) ([cd54e27](https://github.com/miniapp-tool/mptool/commit/cd54e273d4789e717998262501beb9128e16d53d))
- **deps:** update dependency tsdown to v0.22.9 ([#1387](https://github.com/miniapp-tool/mptool/issues/1387)) ([dbd6f53](https://github.com/miniapp-tool/mptool/commit/dbd6f5309dc8bacc1da558de9a424abaf9376131))
- **deps:** update dependency typescript to v7 ([#1386](https://github.com/miniapp-tool/mptool/issues/1386)) ([67d9265](https://github.com/miniapp-tool/mptool/commit/67d92659548ac8095886c90f5b3439f5b11abd46))
- **deps:** update dependency unrun to v0.2.37 ([#1316](https://github.com/miniapp-tool/mptool/issues/1316)) ([5466fbd](https://github.com/miniapp-tool/mptool/commit/5466fbd3c9294c2f73c93fe569e1da6d56f42846))
- **deps:** update dependency unrun to v0.3.0 ([#1336](https://github.com/miniapp-tool/mptool/issues/1336)) ([4411ea5](https://github.com/miniapp-tool/mptool/commit/4411ea57a5b349d366d09c24451930c5c95a1944))
- **deps:** update dependency unrun to v0.3.1 ([#1357](https://github.com/miniapp-tool/mptool/issues/1357)) ([33d46ac](https://github.com/miniapp-tool/mptool/commit/33d46acbaa39de496f191a81655851e784c23d51))
- **deps:** update dependency vue to v3.5.33 ([#1317](https://github.com/miniapp-tool/mptool/issues/1317)) ([89164e5](https://github.com/miniapp-tool/mptool/commit/89164e57631009e6778c7522049641331c1f76b5))
- **deps:** update dependency vue to v3.5.34 ([#1331](https://github.com/miniapp-tool/mptool/issues/1331)) ([7e8bbf0](https://github.com/miniapp-tool/mptool/commit/7e8bbf0d88bceb991c2f53bb9a0e96fe77ee4984))
- **deps:** update dependency vue to v3.5.35 ([#1350](https://github.com/miniapp-tool/mptool/issues/1350)) ([e03be71](https://github.com/miniapp-tool/mptool/commit/e03be71738ed373d81802d47ab59bcc453f484ad))
- **deps:** update dependency vue to v3.5.39 ([#1369](https://github.com/miniapp-tool/mptool/issues/1369)) ([c713092](https://github.com/miniapp-tool/mptool/commit/c713092e36bf5a064a6cb57f4ef33654f1b1830f))
- **deps:** update dependency vue to v3.5.40 ([#1388](https://github.com/miniapp-tool/mptool/issues/1388)) ([b0db99c](https://github.com/miniapp-tool/mptool/commit/b0db99ceaf2ab7781a65d5f0f680af402208ba3c))
- **deps:** update dependency vuepress-theme-hope to v2.0.0-rc.107 ([#1341](https://github.com/miniapp-tool/mptool/issues/1341)) ([59440f5](https://github.com/miniapp-tool/mptool/commit/59440f50f94afbd51622add88d523bd2da2307d5))
- **deps:** update lerna-lite monorepo to v5.2.0 ([#1321](https://github.com/miniapp-tool/mptool/issues/1321)) ([fdd8156](https://github.com/miniapp-tool/mptool/commit/fdd815605a43497086e1c72524e28528472d5b65))
- **deps:** update lerna-lite monorepo to v5.2.1 ([#1326](https://github.com/miniapp-tool/mptool/issues/1326)) ([2f61db6](https://github.com/miniapp-tool/mptool/commit/2f61db610eda57aefae38ade357e1f3e713df444))
- **deps:** update lerna-lite monorepo to v5.2.2 ([#1351](https://github.com/miniapp-tool/mptool/issues/1351)) ([f5a33b3](https://github.com/miniapp-tool/mptool/commit/f5a33b333577266848226d15ab199f1db8762e8f))
- **deps:** update lerna-lite monorepo to v5.3.0 ([#1356](https://github.com/miniapp-tool/mptool/issues/1356)) ([d522dbd](https://github.com/miniapp-tool/mptool/commit/d522dbd7468d44b66d919acca6bb8d3cf4b36148))
- **deps:** update lerna-lite monorepo to v5.4.0 ([#1377](https://github.com/miniapp-tool/mptool/issues/1377)) ([129ec91](https://github.com/miniapp-tool/mptool/commit/129ec91dd9a69093b305bc2ce02d3d25525fcf7a))
- **deps:** update lerna-lite monorepo to v5.4.1 ([#1389](https://github.com/miniapp-tool/mptool/issues/1389)) ([7b5cb41](https://github.com/miniapp-tool/mptool/commit/7b5cb419858f7080af5753fbfa35eb26c22957d9))
- **deps:** update lerna-lite monorepo to v5.4.2 ([#1403](https://github.com/miniapp-tool/mptool/issues/1403)) ([dea0523](https://github.com/miniapp-tool/mptool/commit/dea052328656e82d4d49c29183a853ec53d48f0b))
- **deps:** update vitest monorepo to v4.1.10 ([#1383](https://github.com/miniapp-tool/mptool/issues/1383)) ([596865e](https://github.com/miniapp-tool/mptool/commit/596865e326dec16f2ae1a3de280f7381711ae6d7))
- **deps:** update vitest monorepo to v4.1.5 ([#1319](https://github.com/miniapp-tool/mptool/issues/1319)) ([da163ff](https://github.com/miniapp-tool/mptool/commit/da163ffb44689f6f002deae1a961cb8c6b56d3da))
- **deps:** update vitest monorepo to v4.1.7 ([#1343](https://github.com/miniapp-tool/mptool/issues/1343)) ([79c0740](https://github.com/miniapp-tool/mptool/commit/79c0740a63135ff8b90417bbdb203bf158d40f73))
- **deps:** update vitest monorepo to v4.1.8 ([#1354](https://github.com/miniapp-tool/mptool/issues/1354)) ([558e41e](https://github.com/miniapp-tool/mptool/commit/558e41ea5ffebe28b2d8b7251f88960b26338114))
- **deps:** update vitest monorepo to v4.1.9 ([#1364](https://github.com/miniapp-tool/mptool/issues/1364)) ([1151dc9](https://github.com/miniapp-tool/mptool/commit/1151dc9661ed97dfbdc17bbb229c88682f78f024))
- **deps:** update vue monorepo to v3.5.38 ([#1360](https://github.com/miniapp-tool/mptool/issues/1360)) ([431f2ae](https://github.com/miniapp-tool/mptool/commit/431f2ae493c5b1f3e512c46637c0d8746609f8df))

### Tests

- **api:** add confirm test ([4b08479](https://github.com/miniapp-tool/mptool/commit/4b08479f5e219803ddfb637124a09cf96006832a))
- **api:** add tests for update, report and document ([9b71171](https://github.com/miniapp-tool/mptool/commit/9b711711579d10538544622298b0a9044dd7a7a0))
- **api:** cover already-authorized paths for addContact and savePhoto ([d29bdf4](https://github.com/miniapp-tool/mptool/commit/d29bdf40eefd7a3b46c477b23d52b101c5aac634))
- **api:** cover authorization deny paths for addContact and savePhoto ([51a8e4c](https://github.com/miniapp-tool/mptool/commit/51a8e4c21530358b28be1ad5d06c18509432c08e))
- **api:** cover download and showToast failure paths ([bd8a204](https://github.com/miniapp-tool/mptool/commit/bd8a20462f1d56277e36b692df3421f4c5d821d7))
- **api:** cover non-200 download response ([48c0180](https://github.com/miniapp-tool/mptool/commit/48c01808ccff9310f11920c3aefc09280486283b))
- **api:** cover update, confirm, retry and clipboard branches ([3a32a94](https://github.com/miniapp-tool/mptool/commit/3a32a94f292b9d11523e9ff10b4b52970654c34a))
- **api:** rewrite document tests to verify real behavior ([f951f7f](https://github.com/miniapp-tool/mptool/commit/f951f7f043b34f3cab320fffe15e69901e5c3bba))
- **enhance:** cover app show and hide lifecycle ([49cb341](https://github.com/miniapp-tool/mptool/commit/49cb3411c57893f8055c280d5f518cdd265c938a))
- **enhance:** cover bind dispatch and ref attach ([95b1a34](https://github.com/miniapp-tool/mptool/commit/95b1a34af06332b88b96b6c82d807a20e3ed94d9))
- **enhance:** cover bindGo and preload in bridge ([b46f8d1](https://github.com/miniapp-tool/mptool/commit/b46f8d15058dd43c55c60cfacdaa7b0ba598831f))
- **enhance:** cover component lifetimes and methods ([9f012c1](https://github.com/miniapp-tool/mptool/commit/9f012c1ca6592332483b138f24b48b6b07087008))
- **enhance:** cover concurrent navigation lock ([0a37527](https://github.com/miniapp-tool/mptool/commit/0a37527027fa201a70f30425d135be6e600bba12))
- **enhance:** cover maxDelay timeout in navigator ([e510765](https://github.com/miniapp-tool/mptool/commit/e5107655d8abbd089f6addda989289c4c131ee5c))
- **enhance:** cover page lifecycles ([ef766b8](https://github.com/miniapp-tool/mptool/commit/ef766b8e291eb547b4e7461ec83d6c4d4b584c1d))
- **enhance:** fix ready and unload emit assertions ([e9c8d66](https://github.com/miniapp-tool/mptool/commit/e9c8d66a8f67e7ea2036c68d6cfb3c7c5b1a4ee5))
- **file:** cover error branches and align mock fs with wx behavior ([68243f7](https://github.com/miniapp-tool/mptool/commit/68243f70827495cfa0b2c3892a331c6ec0be612f))
- **file:** cover put, take, once and remove in storage ([edd4df1](https://github.com/miniapp-tool/mptool/commit/edd4df1d32d6ae8d612ee3ebe985ae83db7956d2))
- **file:** cover save and readJSON edge cases ([f6d485e](https://github.com/miniapp-tool/mptool/commit/f6d485e0222509a03d91724c48a1b4ef7ef555dc))
- fix test pollution and strengthen assertions after review ([f9878f6](https://github.com/miniapp-tool/mptool/commit/f9878f61d32863e478b1e868c2dc26ad0108db74))
- **mock:** add tests for downloadFile ([872e599](https://github.com/miniapp-tool/mptool/commit/872e599023aedcedd1b4a14d379463c6f2139b6a))
- **mock:** add tests for file system, network, ui and framework mocks ([6a1106f](https://github.com/miniapp-tool/mptool/commit/6a1106f2a09f70e7eefa270e7f1a9007f0204c06))
- **mock:** cover more ui apis ([7cc3bb1](https://github.com/miniapp-tool/mptool/commit/7cc3bb160a77a1b541903ddab76b0677de8484af))
- **mock:** cover navigation methods and request callbacks ([15d1644](https://github.com/miniapp-tool/mptool/commit/15d1644fa5003f2979043820c92da876d67e9313))
- **net:** add tests for Cookie class ([6ef773e](https://github.com/miniapp-tool/mptool/commit/6ef773ebc4fc09daf547dbae28c62f0f8cc79027))
- **net:** cover cookieStore apply and applyHeader ([e3a86ba](https://github.com/miniapp-tool/mptool/commit/e3a86baa19a2d118454120961c7f217f14d03ebb))
- **net:** cover request content-type, cookie and failure ([b2dfbb8](https://github.com/miniapp-tool/mptool/commit/b2dfbb8097a5b48799f31b7449db3e9079b5f5c1))
- **net:** push coverage toward 100% ([0b0036f](https://github.com/miniapp-tool/mptool/commit/0b0036f07fd76e1a212c36fa2bad2d0dd7f521ba))
- **parser:** add svg conversion tests ([e2a49d7](https://github.com/miniapp-tool/mptool/commit/e2a49d74d97a63d35b6c108963468ba9f104af4e))
- **parser:** add tests for svg, appendClass and tag filter ([6d2f724](https://github.com/miniapp-tool/mptool/commit/6d2f7243e4786de435bb8acb6542860235c43b92))
- **parser:** cover svg sizing, empty text nodes and pre-parsed input ([f4ace92](https://github.com/miniapp-tool/mptool/commit/f4ace9219dacd50a5710028da1867c4463cbaf66))
- **shared:** add env detection tests ([fd8a135](https://github.com/miniapp-tool/mptool/commit/fd8a135f1a5b4017df303d18f06be95b2e402ff0))
- **shared:** cover emitAsync wildcard ([0d52b00](https://github.com/miniapp-tool/mptool/commit/0d52b00be3282942084ec05c4ad5053e87d884ad))
- **shared:** cover logger in wx environment ([a4bee4e](https://github.com/miniapp-tool/mptool/commit/a4bee4e218bb9f472ecb744d83c8397907454983))
- **shared:** cover logger info, warn, error and filter ([0a09e46](https://github.com/miniapp-tool/mptool/commit/0a09e46b3e1e3032405b025f1270feb621c91541))
- **shared:** reach 100% statement coverage ([5330d14](https://github.com/miniapp-tool/mptool/commit/5330d1447e43f5923f33e89733722217b81242dc))
- **skyline-enhance:** add tests for $App ([4454378](https://github.com/miniapp-tool/mptool/commit/445437852e6e763f4896d8a73fc225b5ea5b7641))
- **skyline-enhance:** cover component lifetimes and bridge bindGo ([de10f8a](https://github.com/miniapp-tool/mptool/commit/de10f8a76fa88d03f7d99d622473edeb1500b59e))
- **skyline-enhance:** cover navigator ([a0824dd](https://github.com/miniapp-tool/mptool/commit/a0824dd9deff3bb960217787759087d3cd56ea67))
- update ([f72132b](https://github.com/miniapp-tool/mptool/commit/f72132b02627f4e26b183fcd238250259c17af7d))

### Build System

- add missing deps ([7770bd7](https://github.com/miniapp-tool/mptool/commit/7770bd70835452b72b3598a83a7437906ef2acd2))
- bump deps ([1a63935](https://github.com/miniapp-tool/mptool/commit/1a63935289b5619265893465c1a21ab6a7ca478d))
- bump deps ([bda0a5a](https://github.com/miniapp-tool/mptool/commit/bda0a5a710587959cf17163bed13a5f9697fcc7a))

### Continuous Integration

- update search config ([adddd4d](https://github.com/miniapp-tool/mptool/commit/adddd4d77123e7ab6d757cf8e1efb657f03d406b))

## [0.14.0](https://github.com/miniapp-tool/mptool/compare/v0.13.0...v0.14.0) (2026-04-22)

### ⚠ BREAKING CHANGES

- convert to pure esm and add correct polyfill for buffer

### ✨ Features

- convert to pure esm and add correct polyfill for buffer ([2f7d0c3](https://github.com/miniapp-tool/mptool/commit/2f7d0c371098fef2161d6ed526200763a04cd828))

## [0.13.0](https://github.com/miniapp-tool/mptool/compare/v0.12.2...v0.13.0) (2026-04-16)

### ✨ Features

- **shared:** add createQueue ([ad2070e](https://github.com/miniapp-tool/mptool/commit/ad2070e1d2d9fdd707aee080ceb00ae0df03e54d))

## [0.12.2](https://github.com/miniapp-tool/mptool/compare/v0.12.1...v0.12.2) (2026-04-14)

### 🐛 Bug Fixes

- fix confirm api ([688d4e4](https://github.com/miniapp-tool/mptool/commit/688d4e404b9e629fc53b91e6f983c7cd45e1e12e))

## [0.12.1](https://github.com/miniapp-tool/mptool/compare/v0.12.0...v0.12.1) (2026-04-13)

### 🚀 Performance Improvements

- improve perf ([30df205](https://github.com/miniapp-tool/mptool/commit/30df205d45bcf921c110bc3baf612d0477096902))

## [0.12.0](https://github.com/miniapp-tool/mptool/compare/v0.11.1...v0.12.0) (2025-07-27)

### ✨ Features

- bump deps ([3636bdc](https://github.com/miniapp-tool/mptool/commit/3636bdcd328ff5453b3b9bfde78a035e3dc6c08a))

## [0.11.1](https://github.com/miniapp-tool/mptool/compare/v0.11.0...v0.11.1) (2025-04-09)

### 🐛 Bug Fixes

- **parser:** avoid Buffer ([22785d5](https://github.com/miniapp-tool/mptool/commit/22785d5b5f1af69e662318db1d3ba5efd9868294))

## [0.11.0](https://github.com/miniapp-tool/mptool/compare/v0.10.14...v0.11.0) (2025-04-09)

### ✨ Features

- **parser:** add support for html ([5698a11](https://github.com/miniapp-tool/mptool/commit/5698a11565dd951163fef5a668be2688eb5dd6cc))

## <small>0.10.14 (2025-03-10)</small>

- fix(shared): fix logger ([46835db](https://github.com/miniapp-tool/mptool/commit/46835db))

## <small>0.10.13 (2025-03-10)</small>

- build: bump deps ([6a8cec6](https://github.com/miniapp-tool/mptool/commit/6a8cec6))
- fix: fix logger ([a2a1052](https://github.com/miniapp-tool/mptool/commit/a2a1052))
- chore(deps): update commitlint monorepo to v19.8.0 (#987) ([e8f94dd](https://github.com/miniapp-tool/mptool/commit/e8f94dd)), closes [#987](https://github.com/miniapp-tool/mptool/issues/987)
- chore(deps): update dependency @rollup/plugin-commonjs to v28.0.3 (#981) ([5b75345](https://github.com/miniapp-tool/mptool/commit/5b75345)), closes [#981](https://github.com/miniapp-tool/mptool/issues/981)
- chore(deps): update dependency @types/node to v22.13.10 (#982) ([b10cb41](https://github.com/miniapp-tool/mptool/commit/b10cb41)), closes [#982](https://github.com/miniapp-tool/mptool/issues/982)
- chore(deps): update dependency @vuepress/plugin-slimsearch to v2.0.0-rc.82 (#983) ([dedef15](https://github.com/miniapp-tool/mptool/commit/dedef15)), closes [#983](https://github.com/miniapp-tool/mptool/issues/983)
- chore(deps): update dependency cz-git to v1.11.1 (#984) ([b1a20e8](https://github.com/miniapp-tool/mptool/commit/b1a20e8)), closes [#984](https://github.com/miniapp-tool/mptool/issues/984)
- chore(deps): update dependency eslint to v9.22.0 (#988) ([e7d5c4d](https://github.com/miniapp-tool/mptool/commit/e7d5c4d)), closes [#988](https://github.com/miniapp-tool/mptool/issues/988)
- chore(deps): update dependency eslint-config-mister-hope to v0.8.1 (#989) ([9e1352c](https://github.com/miniapp-tool/mptool/commit/9e1352c)), closes [#989](https://github.com/miniapp-tool/mptool/issues/989)
- chore(deps): update dependency rollup to v4.35.0 (#992) ([0c0b4ef](https://github.com/miniapp-tool/mptool/commit/0c0b4ef)), closes [#992](https://github.com/miniapp-tool/mptool/issues/992)
- chore(deps): update dependency sort-package-json to v3 (#991) ([9445e0f](https://github.com/miniapp-tool/mptool/commit/9445e0f)), closes [#991](https://github.com/miniapp-tool/mptool/issues/991)
- chore(deps): update dependency vuepress-theme-hope to v2.0.0-rc.74 (#985) ([a7d9ba4](https://github.com/miniapp-tool/mptool/commit/a7d9ba4)), closes [#985](https://github.com/miniapp-tool/mptool/issues/985)
- chore(deps): update pnpm to v10.6.1 (#990) ([c8f1495](https://github.com/miniapp-tool/mptool/commit/c8f1495)), closes [#990](https://github.com/miniapp-tool/mptool/issues/990)
- chore(deps): update vitest monorepo to v3.0.8 (#986) ([575c165](https://github.com/miniapp-tool/mptool/commit/575c165)), closes [#986](https://github.com/miniapp-tool/mptool/issues/986)

## <small>0.10.12 (2025-03-03)</small>

- build: bump deps ([5c12f0e](https://github.com/miniapp-tool/mptool/commit/5c12f0e))
- feat(net): improve cookieStore ([f0d3e81](https://github.com/miniapp-tool/mptool/commit/f0d3e81))
- chore: tweaks ([62d3648](https://github.com/miniapp-tool/mptool/commit/62d3648))
- chore: tweaks ([93557ae](https://github.com/miniapp-tool/mptool/commit/93557ae))
- chore(deps): update dependency @lerna-lite/publish to v3.12.2 (#969) ([d300005](https://github.com/miniapp-tool/mptool/commit/d300005)), closes [#969](https://github.com/miniapp-tool/mptool/issues/969)
- chore(deps): update dependency @types/node to v22.13.5 (#960) ([ddcd0ee](https://github.com/miniapp-tool/mptool/commit/ddcd0ee)), closes [#960](https://github.com/miniapp-tool/mptool/issues/960)
- chore(deps): update dependency @types/node to v22.13.8 (#970) ([7913308](https://github.com/miniapp-tool/mptool/commit/7913308)), closes [#970](https://github.com/miniapp-tool/mptool/issues/970)
- chore(deps): update dependency @vuepress/bundler-vite to v2.0.0-rc.20 (#966) ([eb00fef](https://github.com/miniapp-tool/mptool/commit/eb00fef)), closes [#966](https://github.com/miniapp-tool/mptool/issues/966)
- chore(deps): update dependency @vuepress/plugin-slimsearch to v2.0.0-rc.78 (#961) ([5278293](https://github.com/miniapp-tool/mptool/commit/5278293)), closes [#961](https://github.com/miniapp-tool/mptool/issues/961)
- chore(deps): update dependency @vuepress/plugin-slimsearch to v2.0.0-rc.79 (#965) ([ba15e3c](https://github.com/miniapp-tool/mptool/commit/ba15e3c)), closes [#965](https://github.com/miniapp-tool/mptool/issues/965)
- chore(deps): update dependency @vuepress/plugin-slimsearch to v2.0.0-rc.80 (#971) ([3ffa76f](https://github.com/miniapp-tool/mptool/commit/3ffa76f)), closes [#971](https://github.com/miniapp-tool/mptool/issues/971)
- chore(deps): update dependency prettier to v3.5.2 (#964) ([b74f561](https://github.com/miniapp-tool/mptool/commit/b74f561)), closes [#964](https://github.com/miniapp-tool/mptool/issues/964)
- chore(deps): update dependency rollup to v4.34.9 (#979) ([f843759](https://github.com/miniapp-tool/mptool/commit/f843759)), closes [#979](https://github.com/miniapp-tool/mptool/issues/979)
- chore(deps): update dependency rollup-plugin-esbuild to v6.2.1 (#972) ([a0d6b17](https://github.com/miniapp-tool/mptool/commit/a0d6b17)), closes [#972](https://github.com/miniapp-tool/mptool/issues/972)
- chore(deps): update dependency sass-embedded to v1.85.1 (#973) ([b5d70d5](https://github.com/miniapp-tool/mptool/commit/b5d70d5)), closes [#973](https://github.com/miniapp-tool/mptool/issues/973)
- chore(deps): update dependency sort-package-json to v2.15.0 (#976) ([eda33a1](https://github.com/miniapp-tool/mptool/commit/eda33a1)), closes [#976](https://github.com/miniapp-tool/mptool/issues/976)
- chore(deps): update dependency typescript to v5.8.2 (#977) ([10fffe2](https://github.com/miniapp-tool/mptool/commit/10fffe2)), closes [#977](https://github.com/miniapp-tool/mptool/issues/977)
- chore(deps): update dependency vuepress to v2.0.0-rc.20 (#967) ([0b335bf](https://github.com/miniapp-tool/mptool/commit/0b335bf)), closes [#967](https://github.com/miniapp-tool/mptool/issues/967)
- chore(deps): update dependency vuepress-theme-hope to v2.0.0-rc.72 (#968) ([6d3d93e](https://github.com/miniapp-tool/mptool/commit/6d3d93e)), closes [#968](https://github.com/miniapp-tool/mptool/issues/968)
- chore(deps): update dependency vuepress-theme-hope to v2.0.0-rc.73 (#974) ([be5c4bd](https://github.com/miniapp-tool/mptool/commit/be5c4bd)), closes [#974](https://github.com/miniapp-tool/mptool/issues/974)
- chore(deps): update pnpm to v10.5.2 (#978) ([f02762f](https://github.com/miniapp-tool/mptool/commit/f02762f)), closes [#978](https://github.com/miniapp-tool/mptool/issues/978)
- chore(deps): update vitest monorepo to v3.0.7 (#975) ([c745ede](https://github.com/miniapp-tool/mptool/commit/c745ede)), closes [#975](https://github.com/miniapp-tool/mptool/issues/975)
- style: update linter ([363173d](https://github.com/miniapp-tool/mptool/commit/363173d))

## <small>0.10.11 (2025-02-19)</small>

- chore: bump deps ([1824df3](https://github.com/miniapp-tool/mptool/commit/1824df3))
- chore: bump deps ([479d5b4](https://github.com/miniapp-tool/mptool/commit/479d5b4))
- chore: tweak tests ([1c666df](https://github.com/miniapp-tool/mptool/commit/1c666df))
- chore: tweaks ([b49e7a4](https://github.com/miniapp-tool/mptool/commit/b49e7a4))
- chore: tweaks ([5d6a952](https://github.com/miniapp-tool/mptool/commit/5d6a952))
- chore: update deps ([2956203](https://github.com/miniapp-tool/mptool/commit/2956203))
- chore(config): migrate config .github/renovate.json (#859) ([889f50c](https://github.com/miniapp-tool/mptool/commit/889f50c)), closes [#859](https://github.com/miniapp-tool/mptool/issues/859)
- chore(deps): update commitlint monorepo to v19.6.0 (#876) ([e7b67ef](https://github.com/miniapp-tool/mptool/commit/e7b67ef)), closes [#876](https://github.com/miniapp-tool/mptool/issues/876)
- chore(deps): update commitlint monorepo to v19.7.1 (#941) ([791e872](https://github.com/miniapp-tool/mptool/commit/791e872)), closes [#941](https://github.com/miniapp-tool/mptool/issues/941)
- chore(deps): update dependency @codecov/rollup-plugin to v1.5.1 (#888) ([bd4fdd9](https://github.com/miniapp-tool/mptool/commit/bd4fdd9)), closes [#888](https://github.com/miniapp-tool/mptool/issues/888)
- chore(deps): update dependency @codecov/rollup-plugin to v1.6.0 (#896) ([0aaa000](https://github.com/miniapp-tool/mptool/commit/0aaa000)), closes [#896](https://github.com/miniapp-tool/mptool/issues/896)
- chore(deps): update dependency @codecov/rollup-plugin to v1.7.0 (#911) ([3992e8f](https://github.com/miniapp-tool/mptool/commit/3992e8f)), closes [#911](https://github.com/miniapp-tool/mptool/issues/911)
- chore(deps): update dependency @codecov/rollup-plugin to v1.9.0 (#955) ([8e66b2a](https://github.com/miniapp-tool/mptool/commit/8e66b2a)), closes [#955](https://github.com/miniapp-tool/mptool/issues/955)
- chore(deps): update dependency @commitlint/cli to v19.6.1 (#900) ([203f78f](https://github.com/miniapp-tool/mptool/commit/203f78f)), closes [#900](https://github.com/miniapp-tool/mptool/issues/900)
- chore(deps): update dependency @rollup/plugin-commonjs to v28.0.1 ([bb3cdfa](https://github.com/miniapp-tool/mptool/commit/bb3cdfa))
- chore(deps): update dependency @rollup/plugin-commonjs to v28.0.2 (#901) ([aa78026](https://github.com/miniapp-tool/mptool/commit/aa78026)), closes [#901](https://github.com/miniapp-tool/mptool/issues/901)
- chore(deps): update dependency @rollup/plugin-node-resolve to v15.3.1 (#902) ([bb3b0ec](https://github.com/miniapp-tool/mptool/commit/bb3b0ec)), closes [#902](https://github.com/miniapp-tool/mptool/issues/902)
- chore(deps): update dependency @rollup/plugin-node-resolve to v16 (#903) ([cf1ad81](https://github.com/miniapp-tool/mptool/commit/cf1ad81)), closes [#903](https://github.com/miniapp-tool/mptool/issues/903)
- chore(deps): update dependency @types/node to v22.10.10 (#929) ([ac3bc56](https://github.com/miniapp-tool/mptool/commit/ac3bc56)), closes [#929](https://github.com/miniapp-tool/mptool/issues/929)
- chore(deps): update dependency @types/node to v22.10.2 (#892) ([3f8bc5d](https://github.com/miniapp-tool/mptool/commit/3f8bc5d)), closes [#892](https://github.com/miniapp-tool/mptool/issues/892)
- chore(deps): update dependency @types/node to v22.10.5 (#910) ([976eed2](https://github.com/miniapp-tool/mptool/commit/976eed2)), closes [#910](https://github.com/miniapp-tool/mptool/issues/910)
- chore(deps): update dependency @types/node to v22.10.7 (#921) ([56c4bcb](https://github.com/miniapp-tool/mptool/commit/56c4bcb)), closes [#921](https://github.com/miniapp-tool/mptool/issues/921)
- chore(deps): update dependency @types/node to v22.13.0 (#936) ([4e8f133](https://github.com/miniapp-tool/mptool/commit/4e8f133)), closes [#936](https://github.com/miniapp-tool/mptool/issues/936)
- chore(deps): update dependency @types/node to v22.13.1 (#943) ([f68afbe](https://github.com/miniapp-tool/mptool/commit/f68afbe)), closes [#943](https://github.com/miniapp-tool/mptool/issues/943)
- chore(deps): update dependency @types/node to v22.13.4 (#951) ([8148fe4](https://github.com/miniapp-tool/mptool/commit/8148fe4)), closes [#951](https://github.com/miniapp-tool/mptool/issues/951)
- chore(deps): update dependency @types/node to v22.7.7 ([a7d1129](https://github.com/miniapp-tool/mptool/commit/a7d1129))
- chore(deps): update dependency @types/node to v22.8.1 ([8e62d3b](https://github.com/miniapp-tool/mptool/commit/8e62d3b))
- chore(deps): update dependency @types/node to v22.8.6 ([0adc0d3](https://github.com/miniapp-tool/mptool/commit/0adc0d3))
- chore(deps): update dependency @types/node to v22.8.7 ([c68e0ab](https://github.com/miniapp-tool/mptool/commit/c68e0ab))
- chore(deps): update dependency @types/node to v22.9.0 (#858) ([dbea055](https://github.com/miniapp-tool/mptool/commit/dbea055)), closes [#858](https://github.com/miniapp-tool/mptool/issues/858)
- chore(deps): update dependency @types/node to v22.9.2 (#873) ([fd2a9f7](https://github.com/miniapp-tool/mptool/commit/fd2a9f7)), closes [#873](https://github.com/miniapp-tool/mptool/issues/873)
- chore(deps): update dependency @types/node to v22.9.3 (#879) ([a7c2df7](https://github.com/miniapp-tool/mptool/commit/a7c2df7)), closes [#879](https://github.com/miniapp-tool/mptool/issues/879)
- chore(deps): update dependency @vitest/coverage-istanbul to v3.0.5 (#944) ([4a014d6](https://github.com/miniapp-tool/mptool/commit/4a014d6)), closes [#944](https://github.com/miniapp-tool/mptool/issues/944)
- chore(deps): update dependency @vuepress/bundler-vite to v2.0.0-rc.19 (#893) ([7f385fd](https://github.com/miniapp-tool/mptool/commit/7f385fd)), closes [#893](https://github.com/miniapp-tool/mptool/issues/893)
- chore(deps): update dependency @vuepress/plugin-slimsearch to v2.0.0-rc.66 (#894) ([f7e87f3](https://github.com/miniapp-tool/mptool/commit/f7e87f3)), closes [#894](https://github.com/miniapp-tool/mptool/issues/894)
- chore(deps): update dependency @vuepress/plugin-slimsearch to v2.0.0-rc.67 (#904) ([5adab1b](https://github.com/miniapp-tool/mptool/commit/5adab1b)), closes [#904](https://github.com/miniapp-tool/mptool/issues/904)
- chore(deps): update dependency @vuepress/plugin-slimsearch to v2.0.0-rc.68 (#908) ([b55e257](https://github.com/miniapp-tool/mptool/commit/b55e257)), closes [#908](https://github.com/miniapp-tool/mptool/issues/908)
- chore(deps): update dependency @vuepress/plugin-slimsearch to v2.0.0-rc.69 (#915) ([e53637b](https://github.com/miniapp-tool/mptool/commit/e53637b)), closes [#915](https://github.com/miniapp-tool/mptool/issues/915)
- chore(deps): update dependency @vuepress/plugin-slimsearch to v2.0.0-rc.73 (#922) ([96e99f2](https://github.com/miniapp-tool/mptool/commit/96e99f2)), closes [#922](https://github.com/miniapp-tool/mptool/issues/922)
- chore(deps): update dependency @vuepress/plugin-slimsearch to v2.0.0-rc.77 (#958) ([1b62f17](https://github.com/miniapp-tool/mptool/commit/1b62f17)), closes [#958](https://github.com/miniapp-tool/mptool/issues/958)
- chore(deps): update dependency conventional-changelog-conventionalcommits to v8 (#882) ([716ea0f](https://github.com/miniapp-tool/mptool/commit/716ea0f)), closes [#882](https://github.com/miniapp-tool/mptool/issues/882)
- chore(deps): update dependency cz-git to v1.11.0 (#860) ([780fb67](https://github.com/miniapp-tool/mptool/commit/780fb67)), closes [#860](https://github.com/miniapp-tool/mptool/issues/860)
- chore(deps): update dependency eslint to v9.13.0 ([45c3fa5](https://github.com/miniapp-tool/mptool/commit/45c3fa5))
- chore(deps): update dependency eslint to v9.14.0 ([65a2247](https://github.com/miniapp-tool/mptool/commit/65a2247))
- chore(deps): update dependency eslint to v9.16.0 (#868) ([552dc66](https://github.com/miniapp-tool/mptool/commit/552dc66)), closes [#868](https://github.com/miniapp-tool/mptool/issues/868)
- chore(deps): update dependency eslint to v9.17.0 (#897) ([4b8806f](https://github.com/miniapp-tool/mptool/commit/4b8806f)), closes [#897](https://github.com/miniapp-tool/mptool/issues/897)
- chore(deps): update dependency eslint to v9.18.0 (#918) ([bd1ec27](https://github.com/miniapp-tool/mptool/commit/bd1ec27)), closes [#918](https://github.com/miniapp-tool/mptool/issues/918)
- chore(deps): update dependency eslint to v9.20.0 (#946) ([cd62a43](https://github.com/miniapp-tool/mptool/commit/cd62a43)), closes [#946](https://github.com/miniapp-tool/mptool/issues/946)
- chore(deps): update dependency eslint to v9.20.1 (#952) ([ee77647](https://github.com/miniapp-tool/mptool/commit/ee77647)), closes [#952](https://github.com/miniapp-tool/mptool/issues/952)
- chore(deps): update dependency eslint-config-mister-hope to v0.4.0 (#899) ([32513ea](https://github.com/miniapp-tool/mptool/commit/32513ea)), closes [#899](https://github.com/miniapp-tool/mptool/issues/899)
- chore(deps): update dependency eslint-config-mister-hope to v0.4.1 (#920) ([0321d24](https://github.com/miniapp-tool/mptool/commit/0321d24)), closes [#920](https://github.com/miniapp-tool/mptool/issues/920)
- chore(deps): update dependency execa to v9.4.1 ([99ad5fc](https://github.com/miniapp-tool/mptool/commit/99ad5fc))
- chore(deps): update dependency execa to v9.5.0 ([29793a9](https://github.com/miniapp-tool/mptool/commit/29793a9))
- chore(deps): update dependency execa to v9.5.1 ([5240ea4](https://github.com/miniapp-tool/mptool/commit/5240ea4))
- chore(deps): update dependency execa to v9.5.2 (#890) ([8c92fc0](https://github.com/miniapp-tool/mptool/commit/8c92fc0)), closes [#890](https://github.com/miniapp-tool/mptool/issues/890)
- chore(deps): update dependency husky to v9.1.7 (#874) ([081a271](https://github.com/miniapp-tool/mptool/commit/081a271)), closes [#874](https://github.com/miniapp-tool/mptool/issues/874)
- chore(deps): update dependency miniprogram-api-typings to v4.0.2 (#863) ([f736bab](https://github.com/miniapp-tool/mptool/commit/f736bab)), closes [#863](https://github.com/miniapp-tool/mptool/issues/863)
- chore(deps): update dependency miniprogram-api-typings to v4.0.4 (#923) ([07e8c42](https://github.com/miniapp-tool/mptool/commit/07e8c42)), closes [#923](https://github.com/miniapp-tool/mptool/issues/923)
- chore(deps): update dependency miniprogram-api-typings to v4.0.5 (#948) ([c7d90f3](https://github.com/miniapp-tool/mptool/commit/c7d90f3)), closes [#948](https://github.com/miniapp-tool/mptool/issues/948)
- chore(deps): update dependency nodejs-jieba to v0.2.1 ([ce40bee](https://github.com/miniapp-tool/mptool/commit/ce40bee))
- chore(deps): update dependency ora to v8.1.1 ([4e34e0b](https://github.com/miniapp-tool/mptool/commit/4e34e0b))
- chore(deps): update dependency ora to v8.2.0 (#940) ([1d536b3](https://github.com/miniapp-tool/mptool/commit/1d536b3)), closes [#940](https://github.com/miniapp-tool/mptool/issues/940)
- chore(deps): update dependency picocolors to v1.1.1 ([32eae7f](https://github.com/miniapp-tool/mptool/commit/32eae7f))
- chore(deps): update dependency prettier to v3.4.2 (#884) ([cc1a2bf](https://github.com/miniapp-tool/mptool/commit/cc1a2bf)), closes [#884](https://github.com/miniapp-tool/mptool/issues/884)
- chore(deps): update dependency prettier to v3.5.0 (#950) ([bb1e49a](https://github.com/miniapp-tool/mptool/commit/bb1e49a)), closes [#950](https://github.com/miniapp-tool/mptool/issues/950)
- chore(deps): update dependency prettier to v3.5.1 (#953) ([d6ac955](https://github.com/miniapp-tool/mptool/commit/d6ac955)), closes [#953](https://github.com/miniapp-tool/mptool/issues/953)
- chore(deps): update dependency rollup to v4.24.1 ([80cf1f1](https://github.com/miniapp-tool/mptool/commit/80cf1f1))
- chore(deps): update dependency rollup to v4.24.2 ([a9f99bb](https://github.com/miniapp-tool/mptool/commit/a9f99bb))
- chore(deps): update dependency rollup to v4.24.3 ([801f83f](https://github.com/miniapp-tool/mptool/commit/801f83f))
- chore(deps): update dependency rollup to v4.24.4 (#857) ([b9d9c38](https://github.com/miniapp-tool/mptool/commit/b9d9c38)), closes [#857](https://github.com/miniapp-tool/mptool/issues/857)
- chore(deps): update dependency rollup to v4.25.0 (#861) ([276822b](https://github.com/miniapp-tool/mptool/commit/276822b)), closes [#861](https://github.com/miniapp-tool/mptool/issues/861)
- chore(deps): update dependency rollup to v4.27.2 (#869) ([41c0cc6](https://github.com/miniapp-tool/mptool/commit/41c0cc6)), closes [#869](https://github.com/miniapp-tool/mptool/issues/869)
- chore(deps): update dependency rollup to v4.27.4 (#875) ([78cbf8d](https://github.com/miniapp-tool/mptool/commit/78cbf8d)), closes [#875](https://github.com/miniapp-tool/mptool/issues/875)
- chore(deps): update dependency rollup to v4.28.0 (#883) ([b6dc733](https://github.com/miniapp-tool/mptool/commit/b6dc733)), closes [#883](https://github.com/miniapp-tool/mptool/issues/883)
- chore(deps): update dependency rollup to v4.28.1 (#885) ([5ebc4a9](https://github.com/miniapp-tool/mptool/commit/5ebc4a9)), closes [#885](https://github.com/miniapp-tool/mptool/issues/885)
- chore(deps): update dependency rollup to v4.29.1 (#907) ([fde9c22](https://github.com/miniapp-tool/mptool/commit/fde9c22)), closes [#907](https://github.com/miniapp-tool/mptool/issues/907)
- chore(deps): update dependency rollup to v4.29.2 (#914) ([528984e](https://github.com/miniapp-tool/mptool/commit/528984e)), closes [#914](https://github.com/miniapp-tool/mptool/issues/914)
- chore(deps): update dependency rollup to v4.30.1 (#919) ([22a5489](https://github.com/miniapp-tool/mptool/commit/22a5489)), closes [#919](https://github.com/miniapp-tool/mptool/issues/919)
- chore(deps): update dependency rollup to v4.31.0 (#928) ([873f536](https://github.com/miniapp-tool/mptool/commit/873f536)), closes [#928](https://github.com/miniapp-tool/mptool/issues/928)
- chore(deps): update dependency rollup to v4.34.0 (#937) ([241502d](https://github.com/miniapp-tool/mptool/commit/241502d)), closes [#937](https://github.com/miniapp-tool/mptool/issues/937)
- chore(deps): update dependency rollup to v4.34.6 (#945) ([b1b44e2](https://github.com/miniapp-tool/mptool/commit/b1b44e2)), closes [#945](https://github.com/miniapp-tool/mptool/issues/945)
- chore(deps): update dependency rollup to v4.34.7 (#954) ([dbbf628](https://github.com/miniapp-tool/mptool/commit/dbbf628)), closes [#954](https://github.com/miniapp-tool/mptool/issues/954)
- chore(deps): update dependency rollup-plugin-esbuild to v6.2.0 (#947) ([1bbf8ab](https://github.com/miniapp-tool/mptool/commit/1bbf8ab)), closes [#947](https://github.com/miniapp-tool/mptool/issues/947)
- chore(deps): update dependency sass-embedded to v1.80.3 ([929e51c](https://github.com/miniapp-tool/mptool/commit/929e51c))
- chore(deps): update dependency sass-embedded to v1.80.4 ([6791735](https://github.com/miniapp-tool/mptool/commit/6791735))
- chore(deps): update dependency sass-embedded to v1.80.6 ([1908267](https://github.com/miniapp-tool/mptool/commit/1908267))
- chore(deps): update dependency sass-embedded to v1.81.0 (#870) ([db786e8](https://github.com/miniapp-tool/mptool/commit/db786e8)), closes [#870](https://github.com/miniapp-tool/mptool/issues/870)
- chore(deps): update dependency sass-embedded to v1.82.0 (#889) ([8b47d79](https://github.com/miniapp-tool/mptool/commit/8b47d79)), closes [#889](https://github.com/miniapp-tool/mptool/issues/889)
- chore(deps): update dependency sass-embedded to v1.83.0 (#898) ([bafb7b5](https://github.com/miniapp-tool/mptool/commit/bafb7b5)), closes [#898](https://github.com/miniapp-tool/mptool/issues/898)
- chore(deps): update dependency sass-embedded to v1.83.1 (#913) ([d8b5bdc](https://github.com/miniapp-tool/mptool/commit/d8b5bdc)), closes [#913](https://github.com/miniapp-tool/mptool/issues/913)
- chore(deps): update dependency sass-embedded to v1.83.4 (#924) ([927f8e1](https://github.com/miniapp-tool/mptool/commit/927f8e1)), closes [#924](https://github.com/miniapp-tool/mptool/issues/924)
- chore(deps): update dependency sass-embedded to v1.85.0 (#956) ([c3f4b92](https://github.com/miniapp-tool/mptool/commit/c3f4b92)), closes [#956](https://github.com/miniapp-tool/mptool/issues/956)
- chore(deps): update dependency set-cookie-parser to v2.7.1 ([3710d79](https://github.com/miniapp-tool/mptool/commit/3710d79))
- chore(deps): update dependency sort-package-json to v2.12.0 (#877) ([7017eda](https://github.com/miniapp-tool/mptool/commit/7017eda)), closes [#877](https://github.com/miniapp-tool/mptool/issues/877)
- chore(deps): update dependency sort-package-json to v2.14.0 (#927) ([1e91ffa](https://github.com/miniapp-tool/mptool/commit/1e91ffa)), closes [#927](https://github.com/miniapp-tool/mptool/issues/927)
- chore(deps): update dependency tslib to v2.8.0 ([5784722](https://github.com/miniapp-tool/mptool/commit/5784722))
- chore(deps): update dependency tslib to v2.8.1 ([1350bbe](https://github.com/miniapp-tool/mptool/commit/1350bbe))
- chore(deps): update dependency tsx to v4.19.2 ([f976a9d](https://github.com/miniapp-tool/mptool/commit/f976a9d))
- chore(deps): update dependency typescript to v5.7.3 (#916) ([d3d1538](https://github.com/miniapp-tool/mptool/commit/d3d1538)), closes [#916](https://github.com/miniapp-tool/mptool/issues/916)
- chore(deps): update dependency vite to v5.4.10 ([7421e75](https://github.com/miniapp-tool/mptool/commit/7421e75))
- chore(deps): update dependency vite to v5.4.11 (#864) ([ab2ef88](https://github.com/miniapp-tool/mptool/commit/ab2ef88)), closes [#864](https://github.com/miniapp-tool/mptool/issues/864)
- chore(deps): update dependency vite to v5.4.9 ([5bf312c](https://github.com/miniapp-tool/mptool/commit/5bf312c))
- chore(deps): update dependency vitest to v3.0.5 [security] (#942) ([e177f9a](https://github.com/miniapp-tool/mptool/commit/e177f9a)), closes [#942](https://github.com/miniapp-tool/mptool/issues/942)
- chore(deps): update dependency vue to v3.5.13 (#865) ([127cc0c](https://github.com/miniapp-tool/mptool/commit/127cc0c)), closes [#865](https://github.com/miniapp-tool/mptool/issues/865)
- chore(deps): update dependency vuepress to v2.0.0-rc.19 (#895) ([30e0503](https://github.com/miniapp-tool/mptool/commit/30e0503)), closes [#895](https://github.com/miniapp-tool/mptool/issues/895)
- chore(deps): update dependency vuepress-plugin-search-pro to v2.0.0-rc.59 ([30a47bb](https://github.com/miniapp-tool/mptool/commit/30a47bb))
- chore(deps): update dependency vuepress-theme-hope to v2.0.0-rc.59 ([1e71318](https://github.com/miniapp-tool/mptool/commit/1e71318))
- chore(deps): update dependency vuepress-theme-hope to v2.0.0-rc.64 (#886) ([c6903e9](https://github.com/miniapp-tool/mptool/commit/c6903e9)), closes [#886](https://github.com/miniapp-tool/mptool/issues/886)
- chore(deps): update dependency vuepress-theme-hope to v2.0.0-rc.70 (#917) ([2dd22b2](https://github.com/miniapp-tool/mptool/commit/2dd22b2)), closes [#917](https://github.com/miniapp-tool/mptool/issues/917)
- chore(deps): update lerna-lite monorepo to v3.10.0 ([f23a2b7](https://github.com/miniapp-tool/mptool/commit/f23a2b7))
- chore(deps): update lerna-lite monorepo to v3.10.1 (#880) ([e691db1](https://github.com/miniapp-tool/mptool/commit/e691db1)), closes [#880](https://github.com/miniapp-tool/mptool/issues/880)
- chore(deps): update lerna-lite monorepo to v3.11.0 (#912) ([8fcfd7d](https://github.com/miniapp-tool/mptool/commit/8fcfd7d)), closes [#912](https://github.com/miniapp-tool/mptool/issues/912)
- chore(deps): update lerna-lite monorepo to v3.12.0 (#938) ([8743a91](https://github.com/miniapp-tool/mptool/commit/8743a91)), closes [#938](https://github.com/miniapp-tool/mptool/issues/938)
- chore(deps): update lockfile (#826) ([cb55e6d](https://github.com/miniapp-tool/mptool/commit/cb55e6d)), closes [#826](https://github.com/miniapp-tool/mptool/issues/826)
- chore(deps): update lockfile (#862) ([bb04a33](https://github.com/miniapp-tool/mptool/commit/bb04a33)), closes [#862](https://github.com/miniapp-tool/mptool/issues/862)
- chore(deps): update lockfile (#891) ([dbad545](https://github.com/miniapp-tool/mptool/commit/dbad545)), closes [#891](https://github.com/miniapp-tool/mptool/issues/891)
- chore(deps): update pnpm to v10.2.1 (#939) ([f75ae3c](https://github.com/miniapp-tool/mptool/commit/f75ae3c)), closes [#939](https://github.com/miniapp-tool/mptool/issues/939)
- chore(deps): update pnpm to v9.12.3 (#832) ([5833d82](https://github.com/miniapp-tool/mptool/commit/5833d82)), closes [#832](https://github.com/miniapp-tool/mptool/issues/832)
- chore(deps): update pnpm to v9.14.2 (#871) ([02b4ebe](https://github.com/miniapp-tool/mptool/commit/02b4ebe)), closes [#871](https://github.com/miniapp-tool/mptool/issues/871)
- chore(deps): update pnpm to v9.15.0 (#881) ([9259fb1](https://github.com/miniapp-tool/mptool/commit/9259fb1)), closes [#881](https://github.com/miniapp-tool/mptool/issues/881)
- chore(deps): update vitest monorepo to v2.1.3 ([352c701](https://github.com/miniapp-tool/mptool/commit/352c701))
- chore(deps): update vitest monorepo to v2.1.4 ([1fb0d0b](https://github.com/miniapp-tool/mptool/commit/1fb0d0b))
- chore(deps): update vitest monorepo to v2.1.5 (#866) ([063233f](https://github.com/miniapp-tool/mptool/commit/063233f)), closes [#866](https://github.com/miniapp-tool/mptool/issues/866)
- chore(deps): update vitest monorepo to v2.1.8 (#887) ([a41b26d](https://github.com/miniapp-tool/mptool/commit/a41b26d)), closes [#887](https://github.com/miniapp-tool/mptool/issues/887)
- chore(deps): update vitest monorepo to v3.0.2 (#925) ([ebe1247](https://github.com/miniapp-tool/mptool/commit/ebe1247)), closes [#925](https://github.com/miniapp-tool/mptool/issues/925)
- build: bump deps ([83d6a8b](https://github.com/miniapp-tool/mptool/commit/83d6a8b))
- build: bump deps ([ce3ce42](https://github.com/miniapp-tool/mptool/commit/ce3ce42))
- fix(deps): update dependency miniprogram-api-typings to v4.0.5 (#949) ([43b6490](https://github.com/miniapp-tool/mptool/commit/43b6490)), closes [#949](https://github.com/miniapp-tool/mptool/issues/949)
- feat: update linter ([2d4fefe](https://github.com/miniapp-tool/mptool/commit/2d4fefe))

## <small>0.10.10 (2024-10-12)</small>

- chore: bump deps ([0ed81ad](https://github.com/miniapp-tool/mptool/commit/0ed81ad))
- chore: bump deps ([9ddaf60](https://github.com/miniapp-tool/mptool/commit/9ddaf60))
- chore: update deps ([59efd4e](https://github.com/miniapp-tool/mptool/commit/59efd4e))
- chore: update package.json ([71e0861](https://github.com/miniapp-tool/mptool/commit/71e0861))
- chore(deps): update commitlint monorepo to v19.5.0 ([e084c54](https://github.com/miniapp-tool/mptool/commit/e084c54))
- chore(deps): update dependency @lerna-lite/cli to v3.9.0 ([52cff17](https://github.com/miniapp-tool/mptool/commit/52cff17))
- chore(deps): update dependency @lerna-lite/cli to v3.9.1 ([4e62125](https://github.com/miniapp-tool/mptool/commit/4e62125))
- chore(deps): update dependency @lerna-lite/publish to v3.9.0 ([a971828](https://github.com/miniapp-tool/mptool/commit/a971828))
- chore(deps): update dependency @lerna-lite/publish to v3.9.1 ([e7ecb17](https://github.com/miniapp-tool/mptool/commit/e7ecb17))
- chore(deps): update dependency @rollup/plugin-commonjs to v26.0.3 ([b91c35c](https://github.com/miniapp-tool/mptool/commit/b91c35c))
- chore(deps): update dependency @rollup/plugin-commonjs to v28 (#808) ([64f545b](https://github.com/miniapp-tool/mptool/commit/64f545b)), closes [#808](https://github.com/miniapp-tool/mptool/issues/808)
- chore(deps): update dependency @rollup/plugin-node-resolve to v15.3.0 (#806) ([38f86ea](https://github.com/miniapp-tool/mptool/commit/38f86ea)), closes [#806](https://github.com/miniapp-tool/mptool/issues/806)
- chore(deps): update dependency @types/node to v22.5.2 ([1cf5d60](https://github.com/miniapp-tool/mptool/commit/1cf5d60))
- chore(deps): update dependency @types/node to v22.5.4 ([7954378](https://github.com/miniapp-tool/mptool/commit/7954378))
- chore(deps): update dependency @types/node to v22.5.5 ([72d26f2](https://github.com/miniapp-tool/mptool/commit/72d26f2))
- chore(deps): update dependency @types/node to v22.7.4 ([17245e2](https://github.com/miniapp-tool/mptool/commit/17245e2))
- chore(deps): update dependency @vuepress/bundler-vite to v2.0.0-rc.18 ([22f8200](https://github.com/miniapp-tool/mptool/commit/22f8200))
- chore(deps): update dependency cz-git to v1.10.0 ([cdd54ef](https://github.com/miniapp-tool/mptool/commit/cdd54ef))
- chore(deps): update dependency esbuild to v0.24.0 ([6d3dc61](https://github.com/miniapp-tool/mptool/commit/6d3dc61))
- chore(deps): update dependency eslint to v9.10.0 ([d5f7818](https://github.com/miniapp-tool/mptool/commit/d5f7818))
- chore(deps): update dependency eslint to v9.11.0 (#795) ([48a3af9](https://github.com/miniapp-tool/mptool/commit/48a3af9)), closes [#795](https://github.com/miniapp-tool/mptool/issues/795)
- chore(deps): update dependency eslint to v9.11.1 ([6b23683](https://github.com/miniapp-tool/mptool/commit/6b23683))
- chore(deps): update dependency execa to v9.4.0 ([013ee68](https://github.com/miniapp-tool/mptool/commit/013ee68))
- chore(deps): update dependency husky to v9.1.6 ([29b0dba](https://github.com/miniapp-tool/mptool/commit/29b0dba))
- chore(deps): update dependency picocolors to v1.1.0 ([b7137d1](https://github.com/miniapp-tool/mptool/commit/b7137d1))
- chore(deps): update dependency rollup to v4.21.2 ([58ab29c](https://github.com/miniapp-tool/mptool/commit/58ab29c))
- chore(deps): update dependency rollup to v4.21.3 ([8fe9d00](https://github.com/miniapp-tool/mptool/commit/8fe9d00))
- chore(deps): update dependency rollup to v4.22.4 (#797) ([4b98f4d](https://github.com/miniapp-tool/mptool/commit/4b98f4d)), closes [#797](https://github.com/miniapp-tool/mptool/issues/797)
- chore(deps): update dependency rollup to v4.22.5 (#803) ([1abcdfa](https://github.com/miniapp-tool/mptool/commit/1abcdfa)), closes [#803](https://github.com/miniapp-tool/mptool/issues/803)
- chore(deps): update dependency sass-embedded to v1.79.4 ([bf65729](https://github.com/miniapp-tool/mptool/commit/bf65729))
- chore(deps): update dependency tsx to v4.19.1 ([e301bdc](https://github.com/miniapp-tool/mptool/commit/e301bdc))
- chore(deps): update dependency vite to v5.4.3 ([ef620ed](https://github.com/miniapp-tool/mptool/commit/ef620ed))
- chore(deps): update dependency vite to v5.4.5 ([61d6503](https://github.com/miniapp-tool/mptool/commit/61d6503))
- chore(deps): update dependency vite to v5.4.7 ([b38f2b2](https://github.com/miniapp-tool/mptool/commit/b38f2b2))
- chore(deps): update dependency vite to v5.4.8 (#804) ([dfcd5c4](https://github.com/miniapp-tool/mptool/commit/dfcd5c4)), closes [#804](https://github.com/miniapp-tool/mptool/issues/804)
- chore(deps): update dependency vue to v3.5.10 (#805) ([055d414](https://github.com/miniapp-tool/mptool/commit/055d414)), closes [#805](https://github.com/miniapp-tool/mptool/issues/805)
- chore(deps): update dependency vue to v3.5.3 ([bc281bc](https://github.com/miniapp-tool/mptool/commit/bc281bc))
- chore(deps): update dependency vue to v3.5.5 ([f663f06](https://github.com/miniapp-tool/mptool/commit/f663f06))
- chore(deps): update dependency vue to v3.5.7 ([098206c](https://github.com/miniapp-tool/mptool/commit/098206c))
- chore(deps): update dependency vue to v3.5.8 ([2b989ec](https://github.com/miniapp-tool/mptool/commit/2b989ec))
- chore(deps): update dependency vuepress-plugin-search-pro to v2.0.0-rc.53 ([f32e398](https://github.com/miniapp-tool/mptool/commit/f32e398))
- chore(deps): update dependency vuepress-theme-hope to v2.0.0-rc.53 ([06b3d08](https://github.com/miniapp-tool/mptool/commit/06b3d08))
- chore(deps): update lerna-lite monorepo to v3.9.2 ([47f6475](https://github.com/miniapp-tool/mptool/commit/47f6475))
- chore(deps): update pnpm to v9.11.0 (#798) ([3e45fe6](https://github.com/miniapp-tool/mptool/commit/3e45fe6)), closes [#798](https://github.com/miniapp-tool/mptool/issues/798)
- chore(deps): update vitest monorepo to v2.1.1 ([6bdbcfe](https://github.com/miniapp-tool/mptool/commit/6bdbcfe))
- feat: use miniprogram-api-typings v4 ([071d8a5](https://github.com/miniapp-tool/mptool/commit/071d8a5))
- test: improve types ([e922418](https://github.com/miniapp-tool/mptool/commit/e922418))

## <small>0.10.9 (2024-10-06)</small>

- feat: use miniprogram-api-typings v4 ([10d6856](https://github.com/miniapp-tool/mptool/commit/10d6856))
- chore: bump deps ([9ddaf60](https://github.com/miniapp-tool/mptool/commit/9ddaf60))
- chore: update deps ([59efd4e](https://github.com/miniapp-tool/mptool/commit/59efd4e))
- chore: update package.json ([71e0861](https://github.com/miniapp-tool/mptool/commit/71e0861))
- chore(deps): update commitlint monorepo to v19.5.0 ([e084c54](https://github.com/miniapp-tool/mptool/commit/e084c54))
- chore(deps): update dependency @lerna-lite/cli to v3.9.0 ([52cff17](https://github.com/miniapp-tool/mptool/commit/52cff17))
- chore(deps): update dependency @lerna-lite/cli to v3.9.1 ([4e62125](https://github.com/miniapp-tool/mptool/commit/4e62125))
- chore(deps): update dependency @lerna-lite/publish to v3.9.0 ([a971828](https://github.com/miniapp-tool/mptool/commit/a971828))
- chore(deps): update dependency @lerna-lite/publish to v3.9.1 ([e7ecb17](https://github.com/miniapp-tool/mptool/commit/e7ecb17))
- chore(deps): update dependency @rollup/plugin-commonjs to v26.0.3 ([b91c35c](https://github.com/miniapp-tool/mptool/commit/b91c35c))
- chore(deps): update dependency @rollup/plugin-commonjs to v28 (#808) ([64f545b](https://github.com/miniapp-tool/mptool/commit/64f545b)), closes [#808](https://github.com/miniapp-tool/mptool/issues/808)
- chore(deps): update dependency @rollup/plugin-node-resolve to v15.3.0 (#806) ([38f86ea](https://github.com/miniapp-tool/mptool/commit/38f86ea)), closes [#806](https://github.com/miniapp-tool/mptool/issues/806)
- chore(deps): update dependency @types/node to v22.5.2 ([1cf5d60](https://github.com/miniapp-tool/mptool/commit/1cf5d60))
- chore(deps): update dependency @types/node to v22.5.4 ([7954378](https://github.com/miniapp-tool/mptool/commit/7954378))
- chore(deps): update dependency @types/node to v22.5.5 ([72d26f2](https://github.com/miniapp-tool/mptool/commit/72d26f2))
- chore(deps): update dependency @types/node to v22.7.4 ([17245e2](https://github.com/miniapp-tool/mptool/commit/17245e2))
- chore(deps): update dependency cz-git to v1.10.0 ([cdd54ef](https://github.com/miniapp-tool/mptool/commit/cdd54ef))
- chore(deps): update dependency esbuild to v0.24.0 ([6d3dc61](https://github.com/miniapp-tool/mptool/commit/6d3dc61))
- chore(deps): update dependency eslint to v9.10.0 ([d5f7818](https://github.com/miniapp-tool/mptool/commit/d5f7818))
- chore(deps): update dependency eslint to v9.11.0 (#795) ([48a3af9](https://github.com/miniapp-tool/mptool/commit/48a3af9)), closes [#795](https://github.com/miniapp-tool/mptool/issues/795)
- chore(deps): update dependency eslint to v9.11.1 ([6b23683](https://github.com/miniapp-tool/mptool/commit/6b23683))
- chore(deps): update dependency execa to v9.4.0 ([013ee68](https://github.com/miniapp-tool/mptool/commit/013ee68))
- chore(deps): update dependency husky to v9.1.6 ([29b0dba](https://github.com/miniapp-tool/mptool/commit/29b0dba))
- chore(deps): update dependency picocolors to v1.1.0 ([b7137d1](https://github.com/miniapp-tool/mptool/commit/b7137d1))
- chore(deps): update dependency rollup to v4.21.2 ([58ab29c](https://github.com/miniapp-tool/mptool/commit/58ab29c))
- chore(deps): update dependency rollup to v4.21.3 ([8fe9d00](https://github.com/miniapp-tool/mptool/commit/8fe9d00))
- chore(deps): update dependency rollup to v4.22.4 (#797) ([4b98f4d](https://github.com/miniapp-tool/mptool/commit/4b98f4d)), closes [#797](https://github.com/miniapp-tool/mptool/issues/797)
- chore(deps): update dependency rollup to v4.22.5 (#803) ([1abcdfa](https://github.com/miniapp-tool/mptool/commit/1abcdfa)), closes [#803](https://github.com/miniapp-tool/mptool/issues/803)
- chore(deps): update dependency sass-embedded to v1.79.4 ([bf65729](https://github.com/miniapp-tool/mptool/commit/bf65729))
- chore(deps): update dependency tsx to v4.19.1 ([e301bdc](https://github.com/miniapp-tool/mptool/commit/e301bdc))
- chore(deps): update dependency vite to v5.4.3 ([ef620ed](https://github.com/miniapp-tool/mptool/commit/ef620ed))
- chore(deps): update dependency vite to v5.4.5 ([61d6503](https://github.com/miniapp-tool/mptool/commit/61d6503))
- chore(deps): update dependency vite to v5.4.7 ([b38f2b2](https://github.com/miniapp-tool/mptool/commit/b38f2b2))
- chore(deps): update dependency vite to v5.4.8 (#804) ([dfcd5c4](https://github.com/miniapp-tool/mptool/commit/dfcd5c4)), closes [#804](https://github.com/miniapp-tool/mptool/issues/804)
- chore(deps): update dependency vue to v3.5.10 (#805) ([055d414](https://github.com/miniapp-tool/mptool/commit/055d414)), closes [#805](https://github.com/miniapp-tool/mptool/issues/805)
- chore(deps): update dependency vue to v3.5.3 ([bc281bc](https://github.com/miniapp-tool/mptool/commit/bc281bc))
- chore(deps): update dependency vue to v3.5.5 ([f663f06](https://github.com/miniapp-tool/mptool/commit/f663f06))
- chore(deps): update dependency vue to v3.5.7 ([098206c](https://github.com/miniapp-tool/mptool/commit/098206c))
- chore(deps): update dependency vue to v3.5.8 ([2b989ec](https://github.com/miniapp-tool/mptool/commit/2b989ec))
- chore(deps): update dependency vuepress-plugin-search-pro to v2.0.0-rc.53 ([f32e398](https://github.com/miniapp-tool/mptool/commit/f32e398))
- chore(deps): update dependency vuepress-theme-hope to v2.0.0-rc.53 ([06b3d08](https://github.com/miniapp-tool/mptool/commit/06b3d08))
- chore(deps): update lerna-lite monorepo to v3.9.2 ([47f6475](https://github.com/miniapp-tool/mptool/commit/47f6475))
- chore(deps): update pnpm to v9.11.0 (#798) ([3e45fe6](https://github.com/miniapp-tool/mptool/commit/3e45fe6)), closes [#798](https://github.com/miniapp-tool/mptool/issues/798)
- chore(deps): update vitest monorepo to v2.1.1 ([6bdbcfe](https://github.com/miniapp-tool/mptool/commit/6bdbcfe))
- test: improve types ([e922418](https://github.com/miniapp-tool/mptool/commit/e922418))

## <small>0.10.8 (2024-08-30)</small>

- chore: tweaks ([e4d7727](https://github.com/miniapp-tool/mptool/commit/e4d7727))

## <small>0.10.7 (2024-08-30)</small>

- chore: update typings ([2e09144](https://github.com/miniapp-tool/mptool/commit/2e09144))
- feat: improve types ([15f355f](https://github.com/miniapp-tool/mptool/commit/15f355f))

## <small>0.10.6 (2024-08-29)</small>

- feat: add correct export ([66ad686](https://github.com/miniapp-tool/mptool/commit/66ad686))

## <small>0.10.5 (2024-08-29)</small>

- feat(enhance): export navigator methods ([d9c9cb5](https://github.com/miniapp-tool/mptool/commit/d9c9cb5))

## <small>0.10.4 (2024-08-29)</small>

- fix(api): fix confirm and retry ([9f93b67](https://github.com/miniapp-tool/mptool/commit/9f93b67))

## <small>0.10.3 (2024-08-29)</small>

- feat: improve api ([3cb8dd9](https://github.com/miniapp-tool/mptool/commit/3cb8dd9))

## <small>0.10.2 (2024-08-28)</small>

- fix(api): fix api name ([eb34e40](https://github.com/miniapp-tool/mptool/commit/eb34e40))

## <small>0.10.1 (2024-08-28)</small>

- feat: add api package ([cff4cf6](https://github.com/miniapp-tool/mptool/commit/cff4cf6))
- chore(deps): update commitlint monorepo to v19.4.1 ([7497f07](https://github.com/miniapp-tool/mptool/commit/7497f07))
- chore(deps): update dependency @types/node to v22.5.1 ([2c1a41c](https://github.com/miniapp-tool/mptool/commit/2c1a41c))
- chore(deps): update dependency rollup to v4.21.1 ([c4d7845](https://github.com/miniapp-tool/mptool/commit/c4d7845))
- chore(deps): update dependency tsx to v4.19.0 ([2f76a07](https://github.com/miniapp-tool/mptool/commit/2f76a07))

## [0.10.0](https://github.com/miniapp-tool/mptool/compare/v0.9.1...v0.10.0) (2024-08-26)

### ✨ Features

- add toString() method for MpError ([4ea433c](https://github.com/miniapp-tool/mptool/commit/4ea433cc7b05305f95f4a8b8460fd234a9bc1922))

## [0.9.1](https://github.com/miniapp-tool/mptool/compare/v0.9.0...v0.9.1) (2024-08-25)

### 🐛 Bug Fixes

- **net:** fix url parsing ([5484801](https://github.com/miniapp-tool/mptool/commit/5484801e4c89e8a0e38f06be49af72ce105303ab))

## [0.9.0](https://github.com/miniapp-tool/mptool/compare/v0.8.6...v0.9.0) (2024-08-03)

### ✨ Features

- refine project ([de58367](https://github.com/miniapp-tool/mptool/commit/de58367ee7ed52a842db0d1ce31b427fd61cfc34))

## [0.8.6](https://github.com/miniapp-tool/mptool/compare/v0.8.5...v0.8.6) (2024-07-25)

### Bug Fixes

- **net:** decode header correctly ([c81840d](https://github.com/miniapp-tool/mptool/commit/c81840d34fcecfbe92a2f81376b03dcd59bbf289))

## [0.8.5](https://github.com/miniapp-tool/mptool/compare/v0.8.4...v0.8.5) (2024-07-25)

### Bug Fixes

- **net:** fix cookieStore on node ([dea6fb0](https://github.com/miniapp-tool/mptool/commit/dea6fb0a5cde51d01a486a4160cb4fedc56afdf7))

## [0.8.4](https://github.com/miniapp-tool/mptool/compare/v0.8.3...v0.8.4) (2024-07-24)

### Features

- **net:** add requestHandler ([d5c0527](https://github.com/miniapp-tool/mptool/commit/d5c05279bbb7a8b1c4d1aaa1cd830bcb7cbf80be))

## [0.8.3](https://github.com/miniapp-tool/mptool/compare/v0.8.2...v0.8.3) (2024-07-01)

### Features

- **net:** use high performance mode ([68ada5f](https://github.com/miniapp-tool/mptool/commit/68ada5fb2ca810b52898a4fcdb63f1a0c4b387a8))

## [0.8.2](https://github.com/miniapp-tool/mptool/compare/v0.8.1...v0.8.2) (2024-06-19)

## [0.8.1](https://github.com/miniapp-tool/mptool/compare/v0.8.0...v0.8.1) (2024-06-18)

### Bug Fixes

- **net:** fix cookieStore.clear() ([e11f417](https://github.com/miniapp-tool/mptool/commit/e11f417a2ca2516379a4a79ead0498c1d4ff31c0))

### Reverts

- Revert "feat!: remove parser from all package" ([851a02b](https://github.com/miniapp-tool/mptool/commit/851a02b4449db020ce8efdd07e71fa5bb872ecf5))

## [0.8.0](https://github.com/miniapp-tool/mptool/compare/v0.7.3...v0.8.0) (2024-06-16)

### ⚠ BREAKING CHANGES

- remove parser from all package

### Features

- remove parser from all package ([a5d75d9](https://github.com/miniapp-tool/mptool/commit/a5d75d944e0e0424db1b33c6d3adac00bf6ae9b6))

## [0.7.3](https://github.com/miniapp-tool/mptool/compare/v0.7.2...v0.7.3) (2024-06-15)

### Features

- remove path to name logic ([f556744](https://github.com/miniapp-tool/mptool/commit/f5567447c45202522573ea96c96f1c37203d9ad8))

### Bug Fixes

- fix docs ([73ec60f](https://github.com/miniapp-tool/mptool/commit/73ec60f00d95f95912e3c2b02da9b1d060e0a01d))

## [0.7.2](https://miniapp-tool///compare/v0.7.1...v0.7.2) (2024-06-15)

### Features

- **skyline:** add parser ([0f92a42](https://miniapp-tool///commit/0f92a42b1071ac7201a59f23f084de93f48ba31b))
- **skyline:** remove getName ([b2cd445](https://miniapp-tool///commit/b2cd445d92fcda0a7db9b5ef3fceeba014eb2287))

## [0.7.1](https://miniapp-tool///compare/v0.7.0...v0.7.1) (2024-06-15)

## [0.7.0](https://miniapp-tool///compare/v0.6.4...v0.7.0) (2024-06-15)

### Features

- support getName and getRoute in config and reshape $Component ([06d01e7](https://miniapp-tool///commit/06d01e752f8d9985be3b59a8aff0bc767015d59d))

## [0.6.4](https://miniapp-tool///compare/v0.6.3...v0.6.4) (2024-06-07)

### Bug Fixes

- **parser:** fix rich text bug ([01c396d](https://miniapp-tool///commit/01c396d70c0513a69683fceabc5413705ccc8db9))

## [0.6.3](https://miniapp-tool///compare/v0.6.2...v0.6.3) (2024-01-11)

### Bug Fixes

- **parser:** fix parser ([9050ac4](https://miniapp-tool///commit/9050ac43fc63648ab8f4977a98a88d07225426b8))

## [0.6.2](https://miniapp-tool///compare/v0.6.1...v0.6.2) (2024-01-07)

### Features

- add parser package ([e10be47](https://miniapp-tool///commit/e10be471471933d90991d7de840a4b0220b4170f))

## [0.6.1](https://miniapp-tool///compare/v0.6.0...v0.6.1) (2024-01-07)

### Features

- add parser to all ([13c120c](https://miniapp-tool///commit/13c120c89052aebbf94850348ace858017682ce7))

## [0.6.0](https://miniapp-tool///compare/v0.6.0-beta.16...v0.6.0) (2024-01-06)

### Bug Fixes

- **net:** update types ([2f0229c](https://miniapp-tool///commit/2f0229c7b05690aafc2f07841e709583834a402c))

## [0.6.0-beta.16](https://miniapp-tool///compare/v0.6.0-beta.15...v0.6.0-beta.16) (2024-01-06)

### Bug Fixes

- fix cookieStore ([a3dbbdc](https://miniapp-tool///commit/a3dbbdce7370266d78bd877f2818bc27a6edcafb))

## [0.6.0-beta.15](https://miniapp-tool///compare/v0.6.0-beta.14...v0.6.0-beta.15) (2024-01-06)

### Features

- **net:** compact with Node env ([05fbc9d](https://miniapp-tool///commit/05fbc9dfb8cdf3b28b7772121334814027fa0379))

### Bug Fixes

- **shared:** fix exports ([297d727](https://miniapp-tool///commit/297d727eaf6b0c7c688e47473f81ef26c15bf506))

## [0.6.0-beta.14](https://miniapp-tool///compare/v0.6.0-beta.13...v0.6.0-beta.14) (2024-01-06)

### Bug Fixes

- **net:** fix error when outside mp env ([5db86df](https://miniapp-tool///commit/5db86dff44eca6e0fb351c497dad46f0039cdb88))

## [0.6.0-beta.13](https://miniapp-tool///compare/v0.6.0-beta.12...v0.6.0-beta.13) (2024-01-06)

### Bug Fixes

- **shared:** fix logger ([0f860d7](https://miniapp-tool///commit/0f860d7cc8e7e1c8ee9b8aa81001a612db1075d2))

## [0.6.0-beta.12](https://miniapp-tool///compare/v0.6.0-beta.11...v0.6.0-beta.12) (2024-01-06)

### Bug Fixes

- **shared:** fix logger ([557b083](https://miniapp-tool///commit/557b08337efe11e0e3860f91c852faf52a747397))

## [0.6.0-beta.11](https://miniapp-tool///compare/v0.6.0-beta.10...v0.6.0-beta.11) (2024-01-06)

### Features

- **parser:** update options ([f5661fe](https://miniapp-tool///commit/f5661fe552ddee0f4c9315fc5b74e8080bd49dfe))

## [0.6.0-beta.10](https://miniapp-tool///compare/v0.6.0-beta.9...v0.6.0-beta.10) (2024-01-04)

### Features

- add parser package ([31485dc](https://miniapp-tool///commit/31485dc547c3e49d98ec9d87ecea811d9b1bd484))
- **net:** set content-type header ([58a2b69](https://miniapp-tool///commit/58a2b69adbd7620ec747b01b73012118fb95abc9))

### Bug Fixes

- **net:** fix a bug on iOS ([01efae1](https://miniapp-tool///commit/01efae13d3dc865ddf4b50fa7d08d33bf91c02c7))

## [0.6.0-beta.9](https://miniapp-tool///compare/v0.6.0-beta.8...v0.6.0-beta.9) (2023-12-26)

### Bug Fixes

- **net:** fix headers ([0d57739](https://miniapp-tool///commit/0d577393ead042d45d0c2603f360d1fdfcceba54))

## [0.6.0-beta.8](https://miniapp-tool///compare/v0.6.0-beta.7...v0.6.0-beta.8) (2023-12-26)

### Features

- **net:** improve errorHandler ([0cc79ed](https://miniapp-tool///commit/0cc79eda83fabbdf6b1c7788853fcba31edfe27f))

## [0.6.0-beta.7](https://miniapp-tool///compare/v0.6.0-beta.6...v0.6.0-beta.7) (2023-12-26)

### Features

- **net:** add errorHandler ([70059e5](https://miniapp-tool///commit/70059e5bd2d7c157089de5e3fdc7ec4746580c59))

## [0.6.0-beta.6](https://miniapp-tool///compare/v0.6.0-beta.5...v0.6.0-beta.6) (2023-12-26)

### Features

- update createFetch api ([dee69c6](https://miniapp-tool///commit/dee69c6fb362e058e12e1f4c3ea3691e16fd06ab))

## [0.6.0-beta.5](https://miniapp-tool///compare/v0.6.0-beta.4...v0.6.0-beta.5) (2023-12-26)

### Bug Fixes

- **net:** update export name ([3cf4bc6](https://miniapp-tool///commit/3cf4bc64409ed8dd31873e2ceccf86018f8494b0))

## [0.6.0-beta.4](https://miniapp-tool///compare/v0.6.0-beta.3...v0.6.0-beta.4) (2023-12-26)

### Features

- **net:** update Fetch options ([28f80f9](https://miniapp-tool///commit/28f80f98ece067a4de499d9020fedeadf7b99dbd))

## [0.6.0-beta.3](https://miniapp-tool///compare/v0.6.0-beta.2...v0.6.0-beta.3) (2023-12-26)

### Features

- support response handler ([22ec91f](https://miniapp-tool///commit/22ec91f88de9986c0a7d83560aff3c3ee8437f6f))

## [0.6.0-beta.2](https://miniapp-tool///compare/v0.6.0-beta.1...v0.6.0-beta.2) (2023-12-25)

## [0.6.0-beta.1](https://miniapp-tool///compare/v0.6.0-beta.0...v0.6.0-beta.1) (2023-12-25)

### Bug Fixes

- **net:** improve types ([9a01fd1](https://miniapp-tool///commit/9a01fd1e0b8fb28134c8312b3decc51d77f96c3f))

## [0.6.0-beta.0](https://miniapp-tool///compare/v0.5.0...v0.6.0-beta.0) (2023-12-25)

### Features

- rename @mptool/cookie to @mptool/net ([8324920](https://miniapp-tool///commit/83249206b9747d8780d131436461d954e1e4dcfb))
- update cookie package ([52962aa](https://miniapp-tool///commit/52962aa8e203285acd8cbf9ffff66bbe7da4ad2f))

## [0.5.0](https://miniapp-tool///compare/v0.5.0-beta.0...v0.5.0) (2023-12-20)

### Features

- **cookie:** add applyHeader ([d32abc6](https://miniapp-tool///commit/d32abc6b0358c4e48344c96082d30d3ec039285d))

## [0.5.0-beta.0](https://miniapp-tool///compare/v0.4.0...v0.5.0-beta.0) (2023-09-08)

### Features

- add encoder package ([fe5deae](https://miniapp-tool///commit/fe5deae4876a94b9628b7b222d5da0ef4a625487))

## [0.4.0](https://miniapp-tool///compare/v0.3.6...v0.4.0) (2023-08-23)

### ⚠ BREAKING CHANGES

- **file:** update expire default value

### Features

- add skyline package ([6e4e99b](https://miniapp-tool///commit/6e4e99b1592a7ff8c045b46fe8de05f8ef55c40d))
- **file:** update expire default value ([cd0172e](https://miniapp-tool///commit/cd0172e506173480689be83b3c34169eed877e5d))

## [0.3.6](https://miniapp-tool///compare/v0.3.5...v0.3.6) (2023-07-18)

### Features

- add buffer2base64 helper ([7481886](https://miniapp-tool///commit/7481886dc08c5c60f474fe6f19b01d83bb80dc0b))

## [0.3.5](https://miniapp-tool///compare/v0.3.4...v0.3.5) (2023-07-16)

### Bug Fixes

- **cookie:** fix qq android header ([c891d6c](https://miniapp-tool///commit/c891d6c2f2a79de65d0040385869687ad321d5a7))

## [0.3.4](https://miniapp-tool///compare/v0.3.3...v0.3.4) (2023-07-16)

### Bug Fixes

- fix promise issue on QQ miniapp ([b4550d1](https://miniapp-tool///commit/b4550d1e102bf62de151356768c489cce2f6c8a5))

## [0.3.3](https://miniapp-tool///compare/v0.3.2...v0.3.3) (2023-07-15)

## [0.3.2](https://miniapp-tool///compare/v0.3.1...v0.3.2) (2023-07-15)

### Features

- **cookie:** optimize stringify result ([57f56e3](https://miniapp-tool///commit/57f56e3a129f96729e60d97e306fb49f887b49e5))

### Bug Fixes

- fix domain with port ([97599b2](https://miniapp-tool///commit/97599b2e90fbdecf1b038c5166cc84848b58f6eb))

## [0.3.1](https://miniapp-tool///compare/v0.3.0...v0.3.1) (2023-07-15)

### Features

- add getAllCookies method ([a456bca](https://miniapp-tool///commit/a456bca21f8e3b840077c4b045d673138cb56d52))

### Bug Fixes

- fix bugs ([3022891](https://miniapp-tool///commit/30228913beeaf61f189f68c516380079a262a35e))
- fix cookie ([a58ad12](https://miniapp-tool///commit/a58ad12c98c755a325867cae28a980ae063b5d0b))

## [0.3.0](https://miniapp-tool///compare/v0.2.2...v0.3.0) (2023-07-15)

### Features

- add cookie and all package ([39745cb](https://miniapp-tool///commit/39745cbd36b838b9c0a1c5d841357dba6d7542da))

## [0.2.2](https://miniapp-tool///compare/v0.2.1...v0.2.2) (2023-07-11)

### Features

- support back in wxml ([aaa0d57](https://miniapp-tool///commit/aaa0d57cd304aef5601d6d4500b3ea6ec1f5cf7f))

## [0.2.1](https://miniapp-tool///compare/v0.2.0...v0.2.1) (2023-07-11)

## [0.2.0](https://miniapp-tool///compare/v0.1.6...v0.2.0) (2023-07-10)

### Features

- support redirect to home with $back ([8db1275](https://miniapp-tool///commit/8db12757dc64e7f531ff41e426cbc8172e9f6e7b))

### Bug Fixes

- fix typos in api name ([34a4cef](https://miniapp-tool///commit/34a4cef6c300655bd7e7f8e6174ac3a6f29c0f1a))

## [0.1.6](https://miniapp-tool///compare/v0.1.5...v0.1.6) (2023-07-04)

### [0.1.5](https://miniapp-tool///compare/v0.1.4...v0.1.5) (2022-12-12)

### Bug Fixes

- fix deps ([1f98643](https://miniapp-tool///commit/1f98643f26713141d7bb6c2789b34e2447aef005))

### [0.1.4](https://miniapp-tool///compare/v0.1.3...v0.1.4) (2022-12-12)

### Bug Fixes

- fix entry ([6ef1676](https://miniapp-tool///commit/6ef1676ba63cb9ff6ba460ff24522e651b5f01dc))

### [0.1.3](https://miniapp-tool///compare/v0.1.2...v0.1.3) (2022-12-12)

### [0.1.2](https://miniapp-tool///compare/v0.1.1...v0.1.2) (2022-12-12)

### [0.1.1](https://miniapp-tool///compare/v0.1.0...v0.1.1) (2022-08-27)

### Features

- update types ([8a6901e](https://miniapp-tool///commit/8a6901e0d1c989d55b5810070820de569634440d))

## [0.1.0](https://miniapp-tool///compare/v0.0.1-beta.1...v0.1.0) (2022-08-27)

## [0.0.1-beta.1](https://miniapp-tool///compare/v0.0.1-alpha.18...v0.0.1-beta.1) (2022-05-12)

### Bug Fixes

- **demo:** update demo ([17e3dac](https://miniapp-tool///commit/17e3dac8c406869913943100c3deaead094dbc83))
- update demo ([a1bda7d](https://miniapp-tool///commit/a1bda7d4385b5873d962dd6c9d1d6c4eb46ac63b))

## [0.0.1-alpha.5](http://mister-hope/miniapp/compare/v0.0.1-alpha.4...v0.0.1-alpha.5) (2021-07-07)

### Bug Fixes

- **enhance:** fix wrapper function ([8106b12](http://mister-hope/miniapp/commits/8106b127708f07697bdbed9adc63c0551511cd32))

## [0.0.1-alpha.4](http://mister-hope/miniapp/compare/v0.0.1-alpha.3...v0.0.1-alpha.4) (2021-07-07)

### Bug Fixes

- **enhance:** export missing instance ([a9fed55](http://mister-hope/miniapp/commits/a9fed55b634cf2ab81df8eea804e5b87f9efc5d7))

## [0.0.1-alpha.3](http://mister-hope/miniapp/compare/v0.0.1-alpha.2...v0.0.1-alpha.3) (2021-07-05)

### Features

- **enhance:** rebuild props ([323ff5c](http://mister-hope/miniapp/commits/323ff5c637398f4049641e63fa02075efa9987e3))

## [0.0.1-alpha.2](http://mister-hope/miniapp/compare/v0.0.1-alpha.1...v0.0.1-alpha.2) (2021-07-04)

### Bug Fixes

- **demo:** fix types issues ([57279fa](http://mister-hope/miniapp/commits/57279fa8675851268a668d1d3575c056b7f678a1))
- **enhance:** fix type issues ([baa1743](http://mister-hope/miniapp/commits/baa174342efac3e6167cdc86355fd0d58aac0e6f))
- **mock:** fix types issue on node 16 ([17b8ab6](http://mister-hope/miniapp/commits/17b8ab64bc9e530db885429401781b859f1a0a00))

### Features

- **enhance:** rebuild types ([b5942b2](http://mister-hope/miniapp/commits/b5942b2f050625aaa2ed88c42d9e0211a0cc992a))

## [0.0.1-alpha.1](http://mister-hope/miniapp/compare/v0.0.1-alpha.0...v0.0.1-alpha.1) (2021-07-03)

### Bug Fixes

- **enhance:** align navigator methodName ([a5cb5e6](http://mister-hope/miniapp/commits/a5cb5e699201e384f949a1bcf0c8382073fecd79))
- **enhance:** fix preload options ([be8b30b](http://mister-hope/miniapp/commits/be8b30bf3828822f7f20af754791b69c581d3cd6))

### Features

- add async support for lifecycle ([47565f3](http://mister-hope/miniapp/commits/47565f37b78f21a52bdc2f57d880a17d799be115))
- **enhanc:** add injectComponent ([2473207](http://mister-hope/miniapp/commits/2473207c50e0bfa836e161a69eab9eb9e5d244b3))
- **enhance:** rebuild pagelifecycle options ([e5133a0](http://mister-hope/miniapp/commits/e5133a04d097512dcfa372dab96b3d34a2561c64))
- **enhance:** refine config ([2e6b42b](http://mister-hope/miniapp/commits/2e6b42be34f8d2d920e6018e98f1f7f45c94dbb8))
- **enhance:** refine config ([afd4fb3](http://mister-hope/miniapp/commits/afd4fb3b3bf5461b668486b1c10d554e31489487))
- **enhance:** remove onAppShow ([ea5f720](http://mister-hope/miniapp/commits/ea5f720ad1e6d52b8c46ed774450bbf313346059))
- **md-enhance:** extract $Config method ([a639d85](http://mister-hope/miniapp/commits/a639d85e3308032a49b806d5aa6e7282bf433956))

## [0.0.1-alpha.0](http://mister-hope/miniapp/compare/6422b62bd7185ba17e43ca82d5aa467fcb00ff5c...v0.0.1-alpha.0) (2021-07-02)

### Features

- init project ([6422b62](http://mister-hope/miniapp/commits/6422b62bd7185ba17e43ca82d5aa467fcb00ff5c))
