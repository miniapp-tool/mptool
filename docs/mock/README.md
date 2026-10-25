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

> 网络失败、超时和自定义状态码可以用 [`mockWx`](#控制面-mockwx强制失败与响应注入) 的 `fail()` / `respond()` / `route()` 构造；模拟真实网络延迟仍属于后续版本的能力。

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
> 任务式 API（`wx.request`）：返回真实的 `RequestTask`，失败通过 `fail` 回调投递。
> 事件 / 管理器 / 无参 API 不支持注入，注册规则时会直接报错。

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
  // 路由到失败
  "GET https://api.example.com/slow": { type: "timeout" },
});
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

> 当前版本中，`pages()` / `file()` / `dir()` 会立即生效；`storage` / `auth` / `authorize` / `user` / `system` / `network` / `clipboard` / `login` / `compat` 只是把状态保存到控制面，供后续版本（storage / 权限 / UI / 系统信息归一化）消费。这样可以在不改动现有行为的前提下先把测试写法定下来。

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
