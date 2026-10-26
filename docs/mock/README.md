---
title: "@mptool/mock"
icon: flask
---

`wx` API 模拟，用于在 Node.js / vitest 等环境中直接运行小程序代码。

引入后，`@mptool/mock` 会：

- 在 `globalThis` 上注册 `Page` / `App` / `Component` / `Behavior` / `getCurrentPages`
- 导出完整的 `wx` 对象，覆盖绝大部分常用 API
- 提供事件手动触发能力，方便测试

## 使用

```ts
import { emitEvent, wx } from "@mptool/mock";

// 多数 API 同时支持 Promise 与回调两种风格
const res = await wx.getStorage({ key: "foo" });

// 同步 API 直接返回
const info = wx.getWindowInfo();
```

## 调用约定

### 回调式 API

未传回调时返回 `Promise`，传了 `success` / `complete` 回调时异步触发：

```ts
await wx.showToast({ title: "hi" }); // Promise 风格

wx.showToast({
  title: "hi",
  success: () => console.log("done"), // 回调风格
});
```

### 返回任务（Task）的 API

与真机保持一致，`wx.request` **始终返回 `RequestTask`，不支持 Promise 风格调用**（真机上 `wx.request` 不会返回 Promise）。可以通过返回的任务中断请求：

```ts
const task = wx.request({
  url: "https://example.com/api",
  success: (res) => console.log(res.statusCode),
  fail: ({ errMsg }) => console.error(errMsg),
});

// 中断请求后，fail 会收到 errMsg "request:fail abort"
task.abort();
```

> 网络失败、超时和自定义状态码可以用 [`mockWx`](#控制面-mockwx强制失败与响应注入) 的 `fail()` / `respond()` / `route()` 构造；`respond()` / `route()` 支持 `delay` 模拟慢响应（`wx.request` 自身 `option.timeout` 的自然超时仍属于后续版本的能力）。

任务还提供 `onHeadersReceived` / `offHeadersReceived`（在 `success` 之前触发）以及 `onChunkReceived` / `offChunkReceived`（mock 不会产生数据分片，仅保证接口可用）。

> `wx.downloadFile` / `wx.uploadFile` 同样返回任务对象，其 Task 契约（进度、abort、落盘）会在后续版本补齐。

### 同步 API

`wx.getWindowInfo`、`wx.getStorageSync` 等同步 API 直接返回对象。

## 控制面 `mockWx`（强制失败与响应注入）

除了直接替换 `wx.xxx`，还可以用 `mockWx` 精确控制某个 API 在**何时**、**以什么方式**失败或返回自定义结果。`wx` 仍然是普通的可变对象：直接赋值（如 `wx.request = vi.fn()`）优先级最高，会绕过注入规则。

### 注入失败

```ts
import { mockWx, wx } from "@mptool/mock";

// 只失败下一次
mockWx.failNext("getNetworkType", { type: "network" });

// 一直失败，直到 dispose()
const handle = mockWx.fail("request", { type: "timeout" });
// ... 测试结束后
handle.dispose();

// 只对特定请求生效
mockWx.fail(
  "request",
  { type: "network" },
  { match: (option) => (option as { url: string }).url.includes("/pay") },
);

// 指定失败次数：前两次失败，第三次正常
mockWx.fail("getStorageInfo", { type: "network" }, { times: 2 });

// 依次失败：第一次 network，第二次 timeout，之后恢复正常
mockWx.failSequence("getNetworkType", [{ type: "network" }, { type: "timeout" }]);

// 同步 API 会直接抛错
mockWx.failNext("getStorageSync", { type: "quota" });
wx.getStorageSync("key"); // throws: setStorage:fail exceed storage max size
```

支持的失败类型：

| 类型         | 说明                      | 默认 `errMsg`                                                                     |
| ------------ | ------------------------- | --------------------------------------------------------------------------------- |
| `network`    | 断网 / DNS 失败           | `<api>:fail`                                                                      |
| `timeout`    | 请求超时                  | `<api>:fail timeout`                                                              |
| `abort`      | 请求被中断                | `<api>:fail abort`                                                                |
| `quota`      | storage 配额满            | `setStorage:fail exceed storage max size`                                         |
| `noent`      | 文件 / 目录不存在         | `<api>:fail no such file or directory <path>`（`errCode: 1300002`）               |
| `permission` | 权限被拒绝                | `authorize:fail auth deny` / `<api>:fail permission denied`（`errCode: 1300014`） |
| `cancel`     | 用户取消                  | `showActionSheet:fail cancel` 等                                                  |
| `fail`       | 自定义失败                | 自定义 `errMsg`                                                                   |
| `throw`      | 同步 API 抛出指定 `Error` | -                                                                                 |

> 回调式 API：`fail` 与 `complete` 会被调用；未传回调的 Promise 风格调用会 reject。
> 任务式 API（`wx.request` / `wx.downloadFile` / `wx.uploadFile` / `wx.connectSocket`）：返回任务对象，失败通过 `fail` 回调投递。
> 管理器 API 不支持失败注入，但可以用 `respond()` 替换返回的管理器对象；事件 / 无参 API 的规则会在注册时直接报错。

### 注入响应

```ts
// 回调式 API 的成功结果
mockWx.respond("getNetworkType", { networkType: "none" });

// 同步 API 的返回值
mockWx.respond("getWindowInfo", { windowWidth: 320 });

// 支持异步 responder
mockWx.respond("getStorageInfo", async () => ({ currentSize: 0, keys: [], limitSize: 10240 }));

// 按 URL + method 路由
mockWx.route({
  "GET https://api.example.com/user": { statusCode: 200, data: { name: "hope" } },
  "POST https://api.example.com/pay": { statusCode: 502, data: { error: "bad gateway" } },
  // 正则（可带 flags）
  "/^https:\\/\\/api\\.example\\.com\\/v\\d+\\//": { statusCode: 204 },
  // 单个响应可指定延迟；也可以直接路由到失败
  "GET https://api.example.com/slow": { delay: 100, statusCode: 200 },
  "GET https://api.example.com/offline": { type: "timeout" },
});

// 管理器 API 可以整体替换返回值（失败注入不支持管理器）
mockWx.respond("getUpdateManager", fakeUpdateManager);
```

未命中的请求会落回 mock 的默认响应（`wx.request` 为 `statusCode: 200`、空 body）。

### 调用记录

```ts
wx.showToast({ title: "hi" });
wx.showToast({ title: "again" });

mockWx.calls("showToast"); // [[{ title: "hi" }], [{ title: "again" }]]
mockWx.clearCalls("showToast");
mockWx.clearCalls(); // 清空全部
```

### 作用域与自动还原

```ts
import { afterEach } from "vitest";

// 方式一：每个测试后自动还原（在测试文件顶层调用一次；需显式传入 vitest 的 afterEach）
mockWx.autoRestore(afterEach);

// 方式二：手动作用域
const scope = mockWx.scope();
mockWx.failNext("request", { type: "network" });
// ...
scope.restore();

// 方式三：异步作用域，抛出异常也会还原
await mockWx.run(async () => {
  mockWx.failNext("request", { type: "network" });
  // ...
});
```

`scope()` / `autoRestore()` / `run()` 会一起还原：注入规则、调用记录、storage、内存文件系统、事件监听、页面栈、`wx.env`，以及下面「状态预置」的内容。

`mockWx.reset()` 会做硬重置：清空规则、调用记录、storage、内存文件系统、事件监听、页面栈，并把环境与状态预置恢复为默认值。

### 状态预置

```ts
mockWx.storage({ limitSize: 1024 });
mockWx.auth({ "scope.camera": false });
mockWx.authorize("deny");
mockWx.user({ modal: "cancel" });
mockWx.system({ platform: "android" });
mockWx.network({ networkType: "none" });
mockWx.clipboard("copied");
mockWx.login({ code: "mock-code", sessionValid: false });
mockWx.pages([{ route: "/pages/main" }]);
mockWx.file("data/file.txt", "content");
mockWx.dir("data");
mockWx.compat({ storageResolveMissingKey: true });
```

> `pages()` / `file()` / `dir()` 与 `storage()` 会立即生效；`auth` / `authorize` / `user` / `system` / `network` / `clipboard` / `login` / `compat` 只保存状态，供后续版本（权限 / UI / 系统信息归一化）消费。这样可以在不改动其余行为的前提下先把测试写法定下来。

## Storage 语义（真机对齐）

`@mptool/mock` 的 storage 按微信开发者工具实测行为工作（2026-10 实测，SDK 3.17.4 / libVersion 3.5.0 结论一致）：

- **按值序列化**：写入时序列化、读取时反序列化。修改原对象不会影响已存数据，每次读取都得到新对象；`undefined` 可以存取且不占 value 字节；循环引用等无法序列化的值会失败。**顶层 `Date` 保持 `Date`**（`instanceof Date`、`getTime()` 正常）；**嵌套在对象/数组里的 `Date` 会变成 ISO 字符串**（与真机一致）。
- **缺 key**：
  - `wx.getStorage` 默认 `fail`（`errMsg: "getStorage:fail data not found"`），`complete` 同样收到该文案。
  - `wx.getStorageSync` 默认返回 `""`。
  - `wx.batchGetStorage` 默认 **success**（`errMsg: "batchGetStorage:ok"`），缺失位置为 **`null`**（结果字段是 `dataList`，不是 `data`）。
- **配额**：开发者工具**只强制总量 10 MB**，单 key 1 MB 并不强制（2 MB 单 key 可写入）；超限报 `errMsg: "setStorage:fail exceed storage max size 10Mb"`（同步抛错在工具内会带 `APP-SERVICE-SDK:` 前缀）。`batchSetStorage` 会先整体校验，失败时不会写入任何一项。单 key 限额可用 `mockWx.storage({ keySize })` 显式开启。
- **errMsg**：成功回调统一为 `<api>:ok`（如 `"setStorage:ok"` / `"getStorage:ok"` / `"batchGetStorage:ok"` / `"clearStorage:ok"`）。
- **currentSize**：按 key 名 + 序列化 value 的 UTF-8 字节计算、向上取整到 KB；**空 storage 也返回 `1`**（开发者工具基线）。`limitSize` 默认 `10240`（KB）。

可以用 `mockWx.storage()` 调整（全部单位均为 KB）：

```ts
// 更小的总量配额，便于构造自然超限
mockWx.storage({ limitSize: 1 });

// 显式开启单 key 限额（默认不强制，模拟开发者工具行为）
mockWx.storage({ keySize: 1024 });

// 缺 key 的替代语义（默认值见上）
mockWx.storage({
  missingKey: "resolve", // getStorage 缺 key 走 success
  missingKeySync: "undefined", // getStorageSync 缺 key 返回 undefined
  batchMissingKey: "fail", // batchGetStorage 缺 key 改为 fail
});
```

`missingKey: "resolve"` 时 `wx.getStorage` 成功返回 `{ data: undefined, errMsg: "getStorage:ok" }`；`missingKeySync: "undefined"` 时 `wx.getStorageSync` 返回 `undefined`。

### 旧行为兼容（0.x 过渡）

升级 mock 后如需保留「缺 key 走 success + `undefined`」的旧行为，可开启 compat 开关：

```ts
mockWx.compat({ storageResolveMissingKey: true });
```

开启后，`wx.getStorage` 缺 key 时成功返回 `{ data: undefined, errMsg: "" }`，`wx.getStorageSync` 返回 `undefined`，`batchGetStorage` 缺失位置为 `undefined`（旧形态；结果字段仍为修正后的 `dataList`）。该开关将在 1.0 移除。

### 失败注入

```ts
// 强制配额失败 / 缺文件失败
mockWx.failNext("setStorage", { type: "quota" });
await expect(wx.setStorage({ key: "k", data: "v" })).rejects.toMatchObject({
  errMsg: "setStorage:fail exceed storage max size 10Mb",
});

mockWx.failNext("getStorage", { type: "noent" });
await expect(wx.getStorage({ key: "k" })).rejects.toMatchObject({ errCode: 1300002 });
```

> 自然失败：同步 API 抛出带 `errMsg` 的 `Error`；异步 API 未传回调时 reject **普通对象** `{ errMsg }`（与开发者工具一致），传了回调时调用 `fail` + `complete`。

### 已知开发者工具差异

- 开发者工具里 `wx.batchSetStorage`（异步版）会失败并报 `"batchSetStorage:fail An object could not be cloned."`；mock 不模拟该工具缺陷，异步批量写入正常工作（`batchSetStorageSync` 在工具里正常）。
- 开发者工具对超限的写入会留下一个空/部分 key 条目；mock 不模拟该残缺状态，超限写入不会落盘。

## UI / 权限 / 用户决策

`mockWx` 可以配置用户选择，并查询当前 UI 状态（旧默认行为保持不变：`showModal` 默认确认、`showActionSheet` 默认第 0 项、`authorize` 默认允许、剪贴板默认空）。

### 用户选择

```ts
import { mockWx } from "@mptool/mock";

mockWx.user({
  modal: "cancel", // 或 "confirm" / { confirm: false, content: "typed" }
  actionSheet: 1, // 或 "cancel"
  payment: "cancel", // "success" | "cancel" | "fail"
  subscribe: "reject", // "accept" | "reject" | "cancel"
  userInfo: "deny", // "allow" | "deny"
  gesture: false, // 非用户手势（getUserProfile 失败）
});
```

- `showModal`：`modal: "cancel"` → `{confirm:false,cancel:true}`；`{confirm,content}` 支持 `editable:true` 的输入内容；`modal` 未配置时保持默认确认。
- `showActionSheet`：按下标返回 `tapIndex`；`"cancel"` → `fail "showActionSheet:fail cancel"`；越界 → fail。
- `requestPayment` / `requestSubscribeMessage` / `getUserProfile` / `getUserInfo`：按 `payment` / `subscribe` / `userInfo` / `gesture` 走成功、取消或失败分支。

### 授权状态

```ts
mockWx.auth({ "scope.camera": true, "scope.writePhotosAlbum": false });
mockWx.authorize("deny"); // 所有未授权 scope 的 authorize 都失败
```

- `wx.getSetting` / `wx.openSetting` 返回当前 `authSetting`（只包含配置过或授权过的 scope）。
- `wx.authorize({scope})`：已授权 → 成功；scope 明确为 `false` 或 `authorize("deny")` → `fail "authorize:fail auth deny"` 并记录 `false`；否则成功并记录 `true`。
- `withScope` 的已授权 / 首次授权 / 拒绝 / `getSetting` 失败四条分支都可以用上述配置或 `mockWx.failNext("getSetting", ...)` 覆盖。
- `saveImageToPhotosAlbum` / `saveVideoToPhotosAlbum` 在 `scope.writePhotosAlbum === false` 时 fail `auth deny`。

### 剪贴板

```ts
mockWx.clipboard("preset"); // 预置初值
await wx.setClipboardData({ data: "copied" });
(await wx.getClipboardData({})).data; // "copied"
```

### UI 状态查询

```ts
mockWx.ui();
// {
//   toast: { title, icon?, duration? } | null,
//   loading: { title } | null,
//   modal: { confirm, cancel, content? } | null,
//   actionSheet: { tapIndex } | null,
//   update: { checked, hasUpdate, ready, failed, applied },
// }
```

`showToast` / `showLoading` / `showModal` / `showActionSheet` 会更新状态，`hideToast` / `hideLoading` 清空对应状态；`scope()` / `reset()` 会一起还原。

### 更新管理器

```ts
const manager = wx.getUpdateManager();

manager.onCheckForUpdate(({ hasUpdate }) => {});
manager.onUpdateReady(() => {});
manager.onUpdateFailed(({ errMsg }) => {});

mockWx.emit("updateCheck", { hasUpdate: true });
mockWx.emit("updateReady");
mockWx.emit("updateFailed", { errMsg: "network" });
manager.applyUpdate();
mockWx.ui().update.applied; // true
```

> `ui()` 是新增的只读查询接口；写状态仍然通过 `mockWx.user/auth/authorize/clipboard` 与 `wx` API 本身完成。

## 路由 / 页面栈 / 页面生命周期

`wx.navigateTo` / `redirectTo` / `switchTab` / `reLaunch` / `navigateBack` 现在维护真实页面栈，并按真机顺序触发页面生命周期。

### 页面注册

```ts
Page({
  route: "/pages/detail", // mock 扩展：用于把导航 URL 映射到页面（也支持 $name 末段匹配）
  data: { count: 0 },
  onLoad(query) {},
  onShow() {},
  onReady() {},
  onHide() {},
  onUnload() {},
});
```

- `route` 是 mock 的扩展字段（真机 `Page` 选项没有它）；不写 `route` 时按 `$name` 与 URL 末段匹配（例如 `$name: "main"` 匹配 `/pages/main`）。
- 注册后的页面只有在导航时才会创建实例；实例包含 `route`、`options`（query）、`data`（深拷贝注册时的 `data`）与 `setData(patch, callback?)`。
- `getCurrentPages()` 返回页面实例数组的**快照**（修改返回值不影响栈）。

### tabBar 页面配置

```ts
mockWx.tabBar(["/pages/index/index", "/pages/mine/index"]);
```

- 配置后这些路由被视为 tabBar 页面；也可以用 `Page({ route, tabBar: true })` / `isTabBar: true` 标记。
- `switchTab` 会**保留**其它 tab 页实例：离开时只触发 `onHide`，切回来只触发 `onShow`，不会重新 `onLoad`、也不会 `onUnload`。
- `getCurrentPages()` 在 tab 页场景下只包含当前 tab 页；`reLaunch` 会销毁所有 tab 页（`onUnload`）并清空缓存。
- 未配置任何 tab 页时，`switchTab` 为兼容旧行为不校验目标。

### 导航与页面栈

| API                      | 语义                                                                                                        | 失败                                              |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `navigateTo({url})`      | 压栈，旧页 `onHide` → 新页 `onLoad(query)` / `onShow` / `onReady`                                           | 页面未注册、栈已满 10 层、目标是 tab 页           |
| `redirectTo({url})`      | 替换栈顶，旧页 `onUnload` → 新页 `onLoad/onShow/onReady`                                                    | 页面未注册、目标是 tab 页                         |
| `navigateBack({delta?})` | 出栈 `delta`（默认 1），被出栈页 `onUnload`，新栈顶 `onShow`                                                | 已在首页（`stack.length <= delta`）、非法 delta   |
| `switchTab({url})`       | 隐藏当前 tab 页（不销毁）→ 清空非 tab 页 → 目标 tab 页首次创建时 `onLoad/onShow/onReady`，已存在仅 `onShow` | 页面未注册、目标非 tabBar 页（存在 tab 页定义时） |
| `reLaunch({url})`        | 全部 `onUnload` 后清栈（含缓存的 tab 页）、打开目标页                                                       | 页面未注册                                        |

- 失败通过 `fail` + `complete` 回调或在无回调时 reject `Error`（含 `errMsg`）返回；可用 `mockWx.failNext("navigateTo", ...)` 额外注入失败。
- 未注册页面的错误：`navigateTo:fail page "/pages/x" is not found`；栈满：`navigateTo:fail webview count limit exceed`；非 tab 页：`switchTab:fail can not switch to no-tabBar page`。

### 生命周期

- 新页面：`onLoad(query)` → `onShow()` → `onReady()`，同步按序调用。
- `navigateTo` 前旧页 `onHide`；`redirectTo` / `navigateBack` 出栈页 `onUnload`；`navigateBack` 后新栈顶 `onShow`。
- `Page` 注册、`App` 注册、`getApp()`、`Component` / `Behavior` 记录仍然保留；`getApp()` 返回最近一次 `App(options)` 的选项对象。

> 生命周期是 mock 简化实现：只覆盖导航引起的页面生命周期，不模拟切后台 / 回前台的 `onHide`/`onShow`、渲染层、页面动画与真实 `onReady` 时机，也不实现 enhance 的导航锁 / `onNavigate` 钩子；需要这些行为时请继续替换对应 `wx` 方法或使用 enhance 层测试。

## FileSystemManager 语义

`wx.getFileSystemManager()` 返回完整的 45 个方法（20 个同步 + 25 个异步），路径解析、encoding、错误码与真机对齐：

- **路径**：相对路径按 `wx.env.USER_DATA_PATH` 解析；接受 `wxfile://` / `http://` 前缀（`usr` 用户目录、`tmp` 临时目录）。`.`/`..` 会被解析，越出用户目录（如 `../../etc/passwd`、`wxfile://usr/..`）会以 `1300014` 拒绝。
- **encoding**：
  - 不传 encoding → `ArrayBuffer`；
  - 传 encoding（`utf-8`/`utf8`/`ascii`/`base64`/`binary`/`hex`/`latin1`/`ucs2`/`utf16le`）→ **string**（`binary` 是 string，不是 ArrayBuffer）；
  - 未知 encoding → 失败（`Unknown encoding: xxx`）。
  - 写 `ArrayBuffer`/TypedArray 时按原始字节保存，不做 UTF-8 解码。
- **错误**：同步方法抛 `Error`（带 `errMsg` / `errCode` / `errno`），异步方法走 `fail` + `complete`；`errMsg` 形如 `<api>:fail ...`，错误码使用官方表（`1300002` 不存在、`1300020` not a directory、`1300021` Is a directory、`1300066` 目录非空、`1301003` 对目录非法操作、`1301005` 已存在、`1300014` 路径越权、`1300202` 超出 100 MB）。
- **`stat`**：返回 `{ size, mode, lastAccessedTime, lastModifiedTime, isFile(), isDirectory() }`；`statSync(path, true)` 对目录返回 `[{ path, stats }]`。
- **父目录**：写文件、复制、重命名、保存文件都要求父目录已存在（否则 `1300002`）；`mkdirSync(path)` 非递归时父目录必须存在，`recursive` 才会自动创建。
- **文件描述符**：`openSync({ filePath, flag })` 返回 fd；`readSync`/`writeSync`/`fstatSync`/`ftruncateSync`/`closeSync` 均接收 option 对象（与真机签名一致）。
- **`saveFileSync`**：源临时文件不存在会失败（`1301112`）；目标已存在失败（`1301005`）。
- **异步方法**：回调风格（`success`/`fail`/`complete`），**不支持 Promise 风格**（与真机一致）；未传回调时调用会返回 `undefined`。
- **`unzip` / `readZipEntry`**：mock 不解析真实 zip 二进制；先用文件 API 把「条目表」写成 JSON 作为 zip 内容（mock 约定）：

```ts
wx.getFileSystemManager().writeFileSync(
  `${wx.env.USER_DATA_PATH}/archive.zip`,
  JSON.stringify({ "a.txt": "content", "nested/b.bin": { base64: "AAEC" } }),
);

await new Promise((resolve, reject) => {
  wx.getFileSystemManager().unzip({
    zipFilePath: `${wx.env.USER_DATA_PATH}/archive.zip`,
    targetPath: `${wx.env.USER_DATA_PATH}/out`,
    success: resolve,
    fail: reject,
  });
}); // out/a.txt、out/nested/b.bin

// 条目路径越界（zip-slip，如 "../escape.txt"）会以 1300014 失败，且不会落盘
```

> `getFileInfo` 的 `digest` 目前是占位值，不要用它断言真实哈希。

> 用开发者工具实测确认：不传 encoding 返回 `ArrayBuffer`、`binary` 返回 string、`stat` 字段为 `size/mode/lastAccessedTime/lastModifiedTime`；开发者工具里 `wx.env.USER_DATA_PATH` 实测为 `http://usr`，错误文案细节与 mock 有差异（mock 以官方错误码 + `<api>:fail` 前缀为准）。

## WXML 节点夹具 / SelectorQuery / IntersectionObserver

mock 不渲染 WXML，但可以用节点夹具让 `SelectorQuery` 和 `IntersectionObserver` 驱动布局/曝光逻辑。

### 节点夹具

```ts
mockWx.node("#card", {
  id: "card",
  dataset: { uid: 1 },
  left: 10,
  top: 20,
  width: 300,
  height: 120,
  scrollLeft: 0,
  scrollTop: 0,
  node: { tagName: "view" },
  context: { kind: "rendering-context" },
  ref: { kind: "component" },
  fields: { custom: "value" }, // 会合并进 fields() 结果
});

// 同一个 selector 多次注册 => selectAll 返回多个
mockWx.node(".item", { width: 10, height: 10 });
mockWx.node(".item", { width: 20, height: 20 });

// 清空某个 selector
mockWx.node("#card", null);
```

- `selectViewport()` 读取 `mockWx.node("viewport", info)` 注册的夹具。
- 未注册 `select` → `null`，未注册 `selectAll` → `[]`；`mockWx.scope()` / `reset()` 会一并还原夹具。

### SelectorQuery

```ts
wx.createSelectorQuery()
  .in(this)
  .select("#card")
  .boundingClientRect((rect) => {
    console.log(rect); // { id, dataset, left, top, right, bottom, width, height }
  })
  .selectAll(".item")
  .fields(
    {
      id: true,
      dataset: true,
      rect: true,
      size: true,
      scrollOffset: true,
      node: true,
      context: true,
      ref: true,
    },
    (items) => {},
  )
  .selectViewport()
  .scrollOffset((offset) => {})
  .exec((results) => {
    // 节点回调先触发，exec 回调最后触发，全部异步（setTimeout 0）
  });
```

- 支持 `select` / `selectAll` / `selectViewport` / `in`，以及 `boundingClientRect` / `scrollOffset` / `fields` / `node` / `context` / `ref`。
- `fields` 支持 `id` / `dataset` / `rect` / `size` / `scrollOffset` / `node` / `context` / `ref` / `properties`；夹具里的 `fields` 对象会覆盖/补充结果。

### IntersectionObserver

```ts
const observer = wx.createIntersectionObserver();

observer.relativeToViewport().observe("#card", (result) => {
  // { intersectionRatio, intersectionRect, boundingClientRect, relativeRect, time }
});

mockWx.intersection("#card", {
  intersectionRatio: 0.5,
  intersectionRect: { left: 0, top: 0, right: 100, bottom: 50, width: 100, height: 50 },
});

observer.takeRecords(); // 触发过且未取走的记录
observer.disconnect(); // 之后不再回调
```

- `mockWx.intersection(selector, result?)` 只触发监听同一 selector 的 observer；回调异步（setTimeout 0）。
- `relativeTo` / `relativeToViewport` 仅记录，不参与几何计算。

> 夹具按 selector **精确匹配**，不解析 class / 后代选择器，也不模拟布局引擎；`in(component)` 仍共享全局夹具注册表。

## 系统信息 / 网络状态 / env

`wx.getSystemInfo(Sync)` / `getWindowInfo` / `getDeviceInfo` / `getAppBaseInfo` / `getSystemSetting` / `getAppAuthorizeSetting` 现在由同一份 `mockWx.system()` 配置生成，字段与量纲一致。

```ts
mockWx.system({
  platform: "ios", // ios / android / devtools / windows / mac / ohos
  system: "iOS 17.0",
  brand: "Apple",
  model: "iPhone 15",
  SDKVersion: "3.9.0",
  version: "8.0.20",
  language: "zh_CN",
  theme: "dark", // light / dark
  windowWidth: 414,
  windowHeight: 896,
  pixelRatio: 3,
  statusBarHeight: 44,
  safeArea: { top: 44, bottom: 896, left: 0, right: 414, width: 414, height: 852 },
  fontSizeSetting: 20,
  enableDebug: true,
  bluetoothEnabled: true,
  locationEnabled: true,
  wifiEnabled: true,
  deviceOrientation: "portrait",
  userDataPath: "wxfile://usr", // 同时更新 wx.env.USER_DATA_PATH 与文件系统根目录
});
```

- 默认 `platform = "devtools"`、`brand = "devtools"`、`model = "test"`、`system = "macOS 14.0"`、`SDKVersion = "3.8.0"`、`version = "8.0.0"`、窗口 375×667、`pixelRatio = 2`、`statusBarHeight = 20`。
- `safeArea` 未配置时按 `statusBarHeight` / 窗口尺寸推导；`getWindowInfo().screenTop` 为 0。
- `getSystemInfo` 返回 32 个官方字段 + `theme`，`getSystemInfoSync` 与异步版本一致（异步多 `errMsg`）。
- 默认 `wx.env.USER_DATA_PATH = "wxfile://usr"`（真机取值；开发者工具可能显示 `http://usr`，文件 API 两种 scheme 都接受），`wx.version = "8.0.30"`。
- `mockWx.auth({ scope: false })` 会同时反映到 `getAppAuthorizeSetting()` 与 `getSystemInfo().*Authorized`（未配置的 scope 默认 authorized，保持旧行为）。

### 网络状态

```ts
mockWx.network({
  networkType: "4g", // wifi / 2g / 3g / 4g / 5g / none / unknown
  signalStrength: 42, // iOS 0~1，其他平台 0~100；未配置时按 platform 推导
  weakNet: true,
  offline: true, // 等价于 networkType: "none"
});

wx.onNetworkStatusChange(({ isConnected, networkType }) => {});
mockWx.network({ networkType: "5g" }); // 变化时派发事件
```

- `getNetworkType` 返回 `networkType` / `signalStrength` / `weakNet`；`getConnectedWifi` 的 `signalStrength` 使用同一配置。
- 默认平台为 `devtools`，默认 `signalStrength = 100`（iOS 平台默认 1，与 report 等消费方的量纲判断一致）。
- 只有网络类型/连接状态实际变化时 `onNetworkStatusChange` 才派发；离线用 `offline: true` 或 `networkType: "none"`。
- `mockWx.scope()` / `reset()` 会还原 system / network / `USER_DATA_PATH`。

### canIUse / nextTick

```ts
wx.canIUse("request"); // true
wx.canIUse("totallyNotAnApi.method"); // false
wx.canIUse("openBluetoothAdapter"); // false（非目标 API）

wx.nextTick(() => {}); // 下一时间片执行（不再同步）
```

## 事件监听与手动触发

`wx` 的事件监听 API（如 `onThemeChange`、`onAppShow`、`onWindowResize` 等）默认**不会自动触发**，你需要通过导出的 `emitEvent` 手动触发，以模拟真实场景：

```ts
import { emitEvent, wx } from "@mptool/mock";

const listener = vi.fn();

wx.onThemeChange(listener);
emitEvent("themeChange", { theme: "dark" });

expect(listener).toHaveBeenCalledWith({ theme: "dark" });
```

支持手动触发的事件一览：

| 监听 API                     | 事件名                     | 参数示例                                     |
| ---------------------------- | -------------------------- | -------------------------------------------- |
| `onThemeChange`              | `themeChange`              | `{ theme: "dark" }`                          |
| `onAppShow`                  | `appShow`                  | `{ path, query, scene }`                     |
| `onAppHide`                  | `appHide`                  | -                                            |
| `onWindowResize`             | `windowResize`             | `{ size: { windowWidth, windowHeight } }`    |
| `onUserCaptureScreen`        | `userCaptureScreen`        | -                                            |
| `onKeyboardHeightChange`     | `keyboardHeightChange`     | `{ height }`                                 |
| `onCopyUrl`                  | `copyUrl`                  | `{ query }`                                  |
| `onNeedPrivacyAuthorization` | `needPrivacyAuthorization` | `{ needAuthorization, privacyContractName }` |
| `onAccelerometerChange`      | `accelerometerChange`      | `{ x, y, z }`                                |
| `onCompassChange`            | `compassChange`            | `{ direction }`                              |
| `onDeviceMotionChange`       | `deviceMotionChange`       | `{ alpha, beta, gamma }`                     |
| `onNetworkStatusChange`      | `networkStatusChange`      | `{ isConnected, networkType }`               |
| `onSocketOpen`               | `socketOpen`               | `{ header }`                                 |
| `onSocketMessage`            | `socketMessage`            | `{ data }`                                   |
| `onSocketError`              | `socketError`              | `{ errMsg }`                                 |
| `onSocketClose`              | `socketClose`              | `{ code, reason }`                           |

`off*` API 传入监听函数可移除对应监听器，不传参数则移除该事件的全部监听器。

### 全量事件 API（A1）

除上表外，`miniprogram-api-typings` 里 `interface Wx` 声明的所有事件对都已补齐（共 71 个 `onXxx`、其中 62 个有对应 `offXxx`），包括 `onError`、`onUnhandledRejection`、`onPageNotFound`、`onMemoryWarning`、`onAppRoute`、`onBeforePageLoad`/`onAfterPageLoad`、`onBLEConnectionStateChange`、`onBeaconUpdate`、`onVoIPChatStateChanged`、`onWifiConnected`、`onKeyDown`/`onKeyUp`、`onScreenRecordingStateChanged` 等。

- 事件名 = 去掉 `on` 后的后缀，首字母小写；连续大写缩写按常见读法转小写（`BLE`→`ble`、`VoIP`→`voip`、`HCE`→`hce`、`NFC`→`nfc`、`SOTER`→`soter`、`WiFi`→`wifi`）。
- 用 `mockWx.emit(<事件名>, ...参数)` 触发；`offXxx()` 不传监听器会清空该事件的全部监听器。
- 没有对应 `offXxx` 的事件（如 `onError`）只能注册，测试间可用 `mockWx.reset()` 或 `scope()` 隔离。

```ts
wx.onError((error) => {
  console.log(error);
});

mockWx.emit("error", "boom");

wx.onBLEConnectionStateChange(listener);
mockWx.emit("bleConnectionStateChange", { deviceId: "d1", connected: true });
```

## 管理器对象

`wx.createInnerAudioContext()`、`wx.createVideoContext()`、`wx.createCanvasContext()`、`wx.getRecorderManager()` 等管理器 API 返回的对象，其方法均为空实现（noop），保证调用不报错：

```ts
const audio = wx.createInnerAudioContext();

audio.src = "https://example.com/a.mp3";
audio.play();
audio.pause();
```

## 存储与文件系统

- `wx` 存储 API（`getStorage` / `setStorage` / `getStorageSync` 等）基于内存实现，测试间可通过 `wx.clearStorageSync()` 清理。
- `wx.getFileSystemManager()` 返回基于内存的文件系统管理器，支持 `readFileSync` / `writeFileSync` / `mkdirSync` / `statSync` 等操作。
