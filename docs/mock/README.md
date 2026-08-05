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

### 同步 API

`wx.getWindowInfo`、`wx.getStorageSync` 等同步 API 直接返回对象。

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
