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
