---
title: "@mptool/mock"
icon: flask
---

A `wx` API mock for running mini-program code directly under Node.js / vitest and similar environments. It implements stateful semantics for storage / file system / routing / permissions / network / system info, and also exposes the `mockWx` control plane to inject failures, configure user decisions and preset state.

## Install

```bash
pnpm add -D @mptool/mock
```

## Quick start

Import it once from your test environment's setup file (for example `vitest.setup.ts`):

```ts
import "@mptool/mock";
```

After importing it:

- registers `Page` / `App` / `Component` / `Behavior` / `getCurrentPages` on `globalThis`
- installs the global `wx` object and exports that same `wx`
- provides the `mockWx` control plane and the ability to trigger events

```ts
// example.spec.ts
import "@mptool/mock";
import { mockWx, wx } from "@mptool/mock";
import { beforeEach, describe, expect, it } from "vitest";

describe("example", () => {
  beforeEach(() => {
    mockWx.reset();
  });

  it("reads storage", async () => {
    wx.setStorageSync("token", "abc");

    await expect(wx.getStorage({ key: "token" })).resolves.toMatchObject({ data: "abc" });
  });
});
```

### Test isolation

`mockWx.reset()` restores the default environment (storage / FSM / events / page stack / system / network / `USER_DATA_PATH`, etc.) and restores replaced `wx` methods; calling it in `beforeEach` is recommended. Local state can be restored automatically with `scope()`:

```ts
const scope = mockWx.scope();

mockWx.network({ networkType: "4g" });
// ...

scope.restore(); // only restores the changes made inside the scope
```

You can also use `mockWx.autoRestore(afterEach)` in test frameworks that support `afterEach`; `mockWx.run(callback)` restores automatically after the callback finishes.

## Calling conventions

### Callback-style APIs

Without a callback they return a `Promise`; when `success` / `complete` callbacks are passed they are invoked asynchronously:

```ts
await wx.showToast({ title: "hi" }); // Promise style

wx.showToast({
  title: "hi",
  success: () => console.log("done"), // callback style
});
```

### Task-returning APIs

Consistent with real devices, `wx.request` **always returns a `RequestTask` and does not support Promise-style calls** (on real devices `wx.request` does not return a Promise). The returned task can abort the request:

```ts
const task = wx.request({
  url: "https://example.com/api",
  success: (res) => console.log(res.statusCode),
  fail: ({ errMsg }) => console.error(errMsg),
});

// after aborting, fail receives errMsg "request:fail abort"
task.abort();
```

> Network failures, timeouts and custom status codes can be constructed with `fail()` / `respond()` / `route()` on [`mockWx`](#mockwx-control-plane-forced-failures-and-response-injection); `respond()` / `route()` support `delay` to simulate slow responses (the mock does not auto-timeout from `option.timeout`; use `mockWx.failNext("request", { type: "timeout" })` when you need the timeout branch).

The task also provides `onHeadersReceived` / `offHeadersReceived` (fired before `success`) and `onChunkReceived` / `offChunkReceived` (the mock never produces data chunks; these only guarantee that the interface exists).

> `wx.downloadFile` / `wx.uploadFile` also return task objects; the mock does not produce real progress (progress callbacks are not fired), `abort` works, and failures / cancellations are injected through `mockWx.failNext`.

### Synchronous APIs

Synchronous APIs such as `wx.getWindowInfo` and `wx.getStorageSync` return objects directly.

## Common scenarios

Below are the most common test patterns; the complete semantics of each behaviour are covered in the following sections.

### Failure injection

```ts
mockWx.failNext("getNetworkType", { type: "network" });
await expect(wx.getNetworkType({})).rejects.toMatchObject({
  errMsg: expect.stringContaining("fail"),
});

const handle = mockWx.fail("request", { type: "timeout" });
// ...
handle.dispose();
```

### User decisions / permissions

```ts
mockWx.user({ modal: "cancel", actionSheet: 1, payment: "cancel" });
mockWx.auth({ "scope.camera": false });
mockWx.authorize("deny");
mockWx.clipboard("copied");
```

### Network / system info

```ts
mockWx.system({ platform: "ios", brand: "Apple", windowWidth: 414, windowHeight: 896 });
mockWx.network({ networkType: "4g", signalStrength: 42, weakNet: true });
mockWx.system({ userDataPath: "wxfile://usr" });
```

### Storage

```ts
wx.setStorageSync("key", { a: 1 });
mockWx.storage({ limitSize: 1 }); // KB, convenient for constructing over-quota cases
mockWx.failNext("setStorage", { type: "quota" });
```

### File system (FSM)

```ts
const fs = wx.getFileSystemManager();

fs.mkdirSync(`${wx.env.USER_DATA_PATH}/tmp`, true);
fs.writeFileSync(`${wx.env.USER_DATA_PATH}/tmp/a.txt`, "hello");
fs.readFileSync(`${wx.env.USER_DATA_PATH}/tmp/a.txt`, "utf-8"); // "hello"
```

### Page stack

```ts
Page({ route: "/pages/detail", onLoad() {} });

await wx.navigateTo({ url: "/pages/detail?id=1" });
getCurrentPages(); // [{ route: "/pages/detail", ... }]
await wx.navigateBack();
```

### Events

```ts
const listener = vi.fn();

wx.onThemeChange(listener);
mockWx.emit("themeChange", { theme: "dark" });

// failed navigation automatically fires onPageNotFound
wx.onPageNotFound(listener);
await wx.navigateTo({ url: "/pages/missing" }).catch(() => {});
```

### WXML fixtures / SelectorQuery

```ts
mockWx.node("#card", { left: 0, top: 0, width: 300, height: 120 });

wx.createSelectorQuery()
  .select("#card")
  .boundingClientRect((rect) => {
    console.log(rect); // { left: 0, top: 0, width: 300, height: 120, ... }
  })
  .exec();
```

## `mockWx` control plane (forced failures and response injection)

Besides replacing `wx.xxx` directly, you can use `mockWx` to control precisely **when** and **how** an API fails or returns a custom result. `wx` is still a plain mutable object: direct assignment (such as `wx.request = vi.fn()`) has the highest priority and bypasses the injection rules.

### Injecting failures

```ts
import { mockWx, wx } from "@mptool/mock";

// fail only the next call
mockWx.failNext("getNetworkType", { type: "network" });

// keep failing until dispose()
const handle = mockWx.fail("request", { type: "timeout" });
// ... after the test
handle.dispose();

// only affect specific requests
mockWx.fail(
  "request",
  { type: "network" },
  { match: (option) => (option as { url: string }).url.includes("/pay") },
);

// fail a given number of times: the first two fail, the third succeeds
mockWx.fail("getStorageInfo", { type: "network" }, { times: 2 });

// fail in sequence: network first, timeout second, then back to normal
mockWx.failSequence("getNetworkType", [{ type: "network" }, { type: "timeout" }]);

// synchronous APIs throw directly
mockWx.failNext("getStorageSync", { type: "quota" });
wx.getStorageSync("key"); // throws: setStorage:fail exceed storage max size
```

Supported failure types:

| Type         | Description                              | Default `errMsg`                                                                 |
| ------------ | ---------------------------------------- | -------------------------------------------------------------------------------- |
| `network`    | network down / DNS failure               | `<api>:fail`                                                                     |
| `timeout`    | request timed out                        | `<api>:fail timeout`                                                             |
| `abort`      | request aborted                          | `<api>:fail abort`                                                               |
| `quota`      | storage quota full                       | `setStorage:fail exceed storage max size`                                        |
| `noent`      | file / directory does not exist          | `<api>:fail no such file or directory <path>` (`errCode: 1300002`)               |
| `permission` | permission denied                        | `authorize:fail auth deny` / `<api>:fail permission denied` (`errCode: 1300014`) |
| `cancel`     | user cancelled                           | `showActionSheet:fail cancel`, etc.                                              |
| `fail`       | custom failure                           | custom `errMsg`                                                                  |
| `throw`      | synchronous API throws the given `Error` | -                                                                                |

> Callback-style APIs: `fail` and `complete` are called; Promise-style calls without a callback reject.
> Task-style APIs (`wx.request` / `wx.downloadFile` / `wx.uploadFile` / `wx.connectSocket`): return a task object and deliver failures through the `fail` callback.
> Manager APIs do not support failure injection, but `respond()` can replace the returned manager object; rules for event / parameterless APIs throw an error immediately at registration.

### Injecting responses

```ts
// success result of a callback-style API
mockWx.respond("getNetworkType", { networkType: "none" });

// return value of a synchronous API
mockWx.respond("getWindowInfo", { windowWidth: 320 });

// asynchronous responders are supported
mockWx.respond("getStorageInfo", async () => ({ currentSize: 0, keys: [], limitSize: 10240 }));

// route by URL + method
mockWx.route({
  "GET https://api.example.com/user": { statusCode: 200, data: { name: "hope" } },
  "POST https://api.example.com/pay": { statusCode: 502, data: { error: "bad gateway" } },
  // regular expression (flags optional)
  "/^https:\\/\\/api\\.example\\.com\\/v\\d+\\//": { statusCode: 204 },
  // a single response can specify a delay; you can also route straight to a failure
  "GET https://api.example.com/slow": { delay: 100, statusCode: 200 },
  "GET https://api.example.com/offline": { type: "timeout" },
});

// manager APIs can have their return value replaced wholesale (failure injection does not support managers)
mockWx.respond("getUpdateManager", fakeUpdateManager);
```

Requests that do not match fall back to the mock's default response (`statusCode: 200` with an empty body for `wx.request`).

### Call records

```ts
wx.showToast({ title: "hi" });
wx.showToast({ title: "again" });

mockWx.calls("showToast"); // [[{ title: "hi" }], [{ title: "again" }]]
mockWx.clearCalls("showToast");
mockWx.clearCalls(); // clear everything
```

### Scopes and automatic restore

```ts
import { afterEach } from "vitest";

// option 1: restore automatically after each test (call once at the top level of the test file; vitest's afterEach must be passed explicitly)
mockWx.autoRestore(afterEach);

// option 2: manual scope
const scope = mockWx.scope();
mockWx.failNext("request", { type: "network" });
// ...
scope.restore();

// option 3: async scope, restored even when an exception is thrown
await mockWx.run(async () => {
  mockWx.failNext("request", { type: "network" });
  // ...
});
```

`scope()` / `autoRestore()` / `run()` restore all of the following together: injection rules, call records, storage, the in-memory file system, event listeners, the page stack, `wx.env`, and the contents of "State presets" below.

`mockWx.reset()` performs a hard reset: it clears rules, call records, storage, the in-memory file system, event listeners and the page stack, and restores the environment and state presets to their defaults.

### State presets

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

> These configurations are read immediately by the corresponding mock behaviour: `auth` / `authorize` / `user` affect permissions and UI, `system` / `network` affect system info and network APIs, `clipboard` / `login` affect the clipboard and login, and `pages` / `file` / `dir` directly preset the page stack and the file system; `scope()` / `reset()` can restore them.

## Storage semantics (aligned with real devices)

`@mptool/mock`'s storage follows behaviour measured in WeChat DevTools (measured 2026-10; SDK 3.17.4 / libVersion 3.5.0 gave consistent conclusions):

- **Serialized by value**: serialized on write, deserialized on read. Mutating the original object does not affect stored data, and every read returns a new object; `undefined` can be stored and read back and does not consume value bytes; values that cannot be serialized (such as circular references) fail. **A top-level `Date` stays a `Date`** (`instanceof Date` and `getTime()` work normally); **a `Date` nested inside an object / array becomes an ISO string** (consistent with real devices).
- **Missing key**:
  - `wx.getStorage` fails by default (`errMsg: "getStorage:fail data not found"`), and `complete` receives the same message.
  - `wx.getStorageSync` returns `""` by default.
  - `wx.batchGetStorage` **succeeds** by default (`errMsg: "batchGetStorage:ok"`), and missing positions are **`null`** (the result field is `dataList`, not `data`).
- **Quota**: DevTools **only enforces the 10 MB total**; the 1 MB per-key limit is not enforced (a 2 MB single key can be written); exceeding the limit reports `errMsg: "setStorage:fail exceed storage max size 10Mb"` (synchronous throws inside DevTools carry an `APP-SERVICE-SDK:` prefix). `batchSetStorage` validates everything first and writes nothing when it fails. The per-key limit can be enabled explicitly with `mockWx.storage({ keySize })`.
- **errMsg**: success callbacks uniformly use `<api>:ok` (such as `"setStorage:ok"` / `"getStorage:ok"` / `"batchGetStorage:ok"` / `"clearStorage:ok"`).
- **currentSize**: calculated from the key name + the UTF-8 bytes of the serialized value, rounded up to KB; **an empty storage also returns `1`** (DevTools baseline). `limitSize` defaults to `10240` (KB).

These can be adjusted with `mockWx.storage()` (all units are KB):

```ts
// smaller total quota, convenient for naturally exceeding it
mockWx.storage({ limitSize: 1 });

// explicitly enable the per-key limit (not enforced by default, mirroring DevTools behaviour)
mockWx.storage({ keySize: 1024 });

// alternative semantics for a missing key (defaults above)
mockWx.storage({
  missingKey: "resolve", // getStorage succeeds on a missing key
  missingKeySync: "undefined", // getStorageSync returns undefined on a missing key
  batchMissingKey: "fail", // batchGetStorage fails on a missing key
});
```

With `missingKey: "resolve"`, `wx.getStorage` returns `{ data: undefined, errMsg: "getStorage:ok" }` on success; with `missingKeySync: "undefined"`, `wx.getStorageSync` returns `undefined`.

### Legacy behaviour compatibility (0.x transition)

After upgrading the mock, if you need to keep the old behaviour of "missing key succeeds + `undefined`", enable the compat switch:

```ts
mockWx.compat({ storageResolveMissingKey: true });
```

When enabled, `wx.getStorage` returns `{ data: undefined, errMsg: "" }` on success for a missing key, `wx.getStorageSync` returns `undefined`, and `wx.batchGetStorage` uses `undefined` for missing positions (the old shape; the result field is still the corrected `dataList`). This switch will be removed in 1.0.

### Failure injection

```ts
// force a quota failure / missing file failure
mockWx.failNext("setStorage", { type: "quota" });
await expect(wx.setStorage({ key: "k", data: "v" })).rejects.toMatchObject({
  errMsg: "setStorage:fail exceed storage max size 10Mb",
});

mockWx.failNext("getStorage", { type: "noent" });
await expect(wx.getStorage({ key: "k" })).rejects.toMatchObject({ errCode: 1300002 });
```

> Natural failures: synchronous APIs throw an `Error` carrying `errMsg`; asynchronous APIs reject with a **plain object** `{ errMsg }` when no callback is passed (consistent with DevTools), and call `fail` + `complete` when callbacks are passed.

### Known DevTools differences

- In DevTools, `wx.batchSetStorage` (the async version) fails with `"batchSetStorage:fail An object could not be cloned."`; the mock does not reproduce that DevTools defect, and async batch writes work normally (`batchSetStorageSync` works in DevTools).
- DevTools leaves an empty / partial key entry behind for over-quota writes; the mock does not reproduce that incomplete state, and over-quota writes are not persisted.

## UI / permissions / user decisions

`mockWx` can configure user choices and query the current UI state (the old default behaviour is unchanged: `showModal` confirms by default, `showActionSheet` returns item 0 by default, `authorize` allows by default, and the clipboard is empty by default).

### User choices

```ts
import { mockWx } from "@mptool/mock";

mockWx.user({
  modal: "cancel", // or "confirm" / { confirm: false, content: "typed" }
  actionSheet: 1, // or "cancel"
  payment: "cancel", // "success" | "cancel" | "fail"
  subscribe: "reject", // "accept" | "reject" | "cancel"
  userInfo: "deny", // "allow" | "deny"
  gesture: false, // not a user gesture (getUserProfile fails)
});
```

- `showModal`: `modal: "cancel"` → `{confirm:false,cancel:true}`; `{confirm,content}` supports input content for `editable:true`; when `modal` is not configured the default confirm behaviour is kept.
- `showActionSheet`: returns `tapIndex` by index; `"cancel"` → `fail "showActionSheet:fail cancel"`; out of range → fail.
- `requestPayment` / `requestSubscribeMessage` / `getUserProfile` / `getUserInfo`: follow `payment` / `subscribe` / `userInfo` / `gesture` into the success, cancel or failure branch.

### Authorization state

```ts
mockWx.auth({ "scope.camera": true, "scope.writePhotosAlbum": false });
mockWx.authorize("deny"); // authorize fails for every unauthorized scope
```

- `wx.getSetting` / `wx.openSetting` return the current `authSetting` (only scopes that have been configured or authorized).
- `wx.authorize({scope})`: already authorized → success; scope explicitly `false` or `authorize("deny")` → `fail "authorize:fail auth deny"` and records `false`; otherwise success and records `true`.
- All four branches of `withScope` (already authorized / first authorization / denial / `getSetting` failure) can be covered with the configuration above or with `mockWx.failNext("getSetting", ...)`.
- `saveImageToPhotosAlbum` / `saveVideoToPhotosAlbum` fail with `auth deny` when `scope.writePhotosAlbum === false`.

### Clipboard

```ts
mockWx.clipboard("preset"); // preset initial value
await wx.setClipboardData({ data: "copied" });
(await wx.getClipboardData({})).data; // "copied"
```

### Querying UI state

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

`showToast` / `showLoading` / `showModal` / `showActionSheet` update the state, and `hideToast` / `hideLoading` clear the corresponding state; `scope()` / `reset()` restore it together.

### Update manager

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

> `ui()` is a newly added read-only query interface; state is still written through `mockWx.user/auth/authorize/clipboard` and the `wx` APIs themselves.

## Routing / page stack / page lifecycle

`wx.navigateTo` / `redirectTo` / `switchTab` / `reLaunch` / `navigateBack` now maintain a real page stack and fire page lifecycles in the same order as real devices.

### Page registration

```ts
Page({
  route: "/pages/detail", // mock extension: maps a navigation URL to the page ($name suffix matching is also supported)
  data: { count: 0 },
  onLoad(query) {},
  onShow() {},
  onReady() {},
  onHide() {},
  onUnload() {},
});
```

- `route` is a mock extension field (real `Page` options do not have it); without `route`, matching uses `$name` and the last segment of the URL (for example `$name: "main"` matches `/pages/main`).
- Registered pages are only instantiated on navigation; an instance contains `route`, `options` (query), `data` (a deep copy of the `data` at registration time) and `setData(patch, callback?)`.
- `getCurrentPages()` returns a **snapshot** of the page instance array (mutating the returned value does not affect the stack).

### tabBar page configuration

```ts
mockWx.tabBar(["/pages/index/index", "/pages/mine/index"]);
```

- After configuration these routes are treated as tabBar pages; they can also be marked with `Page({ route, tabBar: true })` / `isTabBar: true`.
- `switchTab` **keeps** other tab page instances: leaving only fires `onHide`, and switching back only fires `onShow`, without re-running `onLoad` or `onUnload`.
- `getCurrentPages()` only contains the current tab page in tab scenarios; `reLaunch` destroys all tab pages (`onUnload`) and clears the cache.
- When no tab pages are configured, `switchTab` does not validate the target, for backward compatibility.

### Navigation and the page stack

| API                      | Semantics                                                                                                                                                                                        | Failure                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `navigateTo({url})`      | pushes onto the stack, old page `onHide` → new page `onLoad(query)` / `onShow` / `onReady`                                                                                                       | page not registered, stack already has 10 levels, target is a tab page             |
| `redirectTo({url})`      | replaces the top of the stack, old page `onUnload` → new page `onLoad/onShow/onReady`                                                                                                            | page not registered, target is a tab page                                          |
| `navigateBack({delta?})` | pops `delta` pages (default 1), popped pages get `onUnload`, the new top of the stack gets `onShow`                                                                                              | already on the first page (`stack.length <= delta`), invalid delta                 |
| `switchTab({url})`       | hides the current tab page (without destroying it) → clears non-tab pages → `onLoad/onShow/onReady` when the target tab page is created for the first time, only `onShow` when it already exists | page not registered, target is not a tabBar page (when tab page definitions exist) |
| `reLaunch({url})`        | `onUnload` for all pages, then clears the stack (including cached tab pages) and opens the target page                                                                                           | page not registered                                                                |

- Failures are returned through the `fail` + `complete` callbacks, or by rejecting an `Error` (carrying `errMsg`) when there is no callback; failures can additionally be injected with `mockWx.failNext("navigateTo", ...)`.
- Errors for unregistered pages: `navigateTo:fail page "/pages/x" is not found`; stack full: `navigateTo:fail webview count limit exceed`; non-tab page: `switchTab:fail can not switch to no-tabBar page`.

### Lifecycle

- New page: `onLoad(query)` → `onShow()` → `onReady()`, called synchronously in order.
- The old page gets `onHide` before `navigateTo`; the popped page gets `onUnload` with `redirectTo` / `navigateBack`; after `navigateBack` the new top of the stack gets `onShow`.
- `Page` registration, `App` registration, `getApp()`, and `Component` / `Behavior` records are still kept; `getApp()` returns the options object of the most recent `App(options)` call.

> Lifecycles are a simplified mock implementation: they only cover page lifecycles caused by navigation and do not simulate background / foreground `onHide` / `onShow`, the render layer, page animations, or real `onReady` timing, nor do they implement enhance's navigation lock / `onNavigate` hooks; if you need those behaviours, keep replacing the corresponding `wx` methods or test at the enhance layer.

## FileSystemManager semantics

`wx.getFileSystemManager()` returns the complete set of 45 methods (20 synchronous + 25 asynchronous); path resolution, encoding and error codes are aligned with real devices:

- **Paths**: relative paths are resolved against `wx.env.USER_DATA_PATH`; the `wxfile://` / `http://` prefixes are accepted (`usr` user directory, `tmp` temporary directory). `.` / `..` are resolved, and paths escaping the user directory (such as `../../etc/passwd`, `wxfile://usr/..`) are rejected with `1300014`.
- **encoding**:
  - no encoding → `ArrayBuffer`;
  - with an encoding (`utf-8` / `utf8` / `ascii` / `base64` / `binary` / `hex` / `latin1` / `ucs2` / `utf16le`) → **string** (`binary` is a string, not an `ArrayBuffer`);
  - unknown encoding → failure (`Unknown encoding: xxx`).
  - writing `ArrayBuffer` / TypedArray stores the raw bytes without UTF-8 decoding.
- **Errors**: synchronous methods throw an `Error` (with `errMsg` / `errCode` / `errno`), asynchronous methods go through `fail` + `complete`; `errMsg` looks like `<api>:fail ...`, and error codes use the official table (`1300002` not found, `1300020` not a directory, `1300021` Is a directory, `1300066` directory not empty, `1301003` illegal operation on a directory, `1301005` already exists, `1300014` path outside the sandbox, `1300202` exceeds 100 MB).
- **`stat`**: returns `{ size, mode, lastAccessedTime, lastModifiedTime, isFile(), isDirectory() }`; `statSync(path, true)` returns `[{ path, stats }]` for directories.
- **Parent directory**: writing a file, copying, renaming and saving a file all require the parent directory to exist (otherwise `1300002`); `mkdirSync(path)` requires the parent directory to exist when not recursive, and only `recursive` creates it automatically.
- **File descriptors**: `openSync({ filePath, flag })` returns an fd; `readSync` / `writeSync` / `fstatSync` / `ftruncateSync` / `closeSync` all accept an options object (matching real-device signatures).
- **`saveFileSync`**: fails when the source temporary file does not exist (`1301112`); fails when the destination already exists (`1301005`).
- **Async methods**: callback style (`success` / `fail` / `complete`), **Promise style is not supported** (consistent with real devices); calls without callbacks return `undefined`.
- **`unzip` / `readZipEntry`**: the mock does not parse real zip binaries; first write the "entry table" as JSON with the file APIs to serve as the zip content (mock convention):

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
}); // out/a.txt, out/nested/b.bin

// entry paths escaping the target (zip-slip, such as "../escape.txt") fail with 1300014 and are not written to disk
```

> `getFileInfo`'s `digest` is currently a placeholder value; do not use it to assert real hashes.

> Measured with DevTools: without an encoding it returns an `ArrayBuffer`, `binary` returns a string, and `stat` fields are `size/mode/lastAccessedTime/lastModifiedTime`; in DevTools `wx.env.USER_DATA_PATH` measures as `http://usr`, and error message details differ from the mock (the mock follows the official error codes + the `<api>:fail` prefix).

## WXML node fixtures / SelectorQuery / IntersectionObserver

The mock does not render WXML, but node fixtures let `SelectorQuery` and `IntersectionObserver` drive layout / exposure logic.

### Node fixtures

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
  fields: { custom: "value" }, // merged into the fields() result
});

// registering the same selector multiple times => selectAll returns multiple nodes
mockWx.node(".item", { width: 10, height: 10 });
mockWx.node(".item", { width: 20, height: 20 });

// clear a selector
mockWx.node("#card", null);
```

- `selectViewport()` reads the fixture registered with `mockWx.node("viewport", info)`.
- Unregistered `select` → `null`, unregistered `selectAll` → `[]`; `mockWx.scope()` / `reset()` also restore fixtures.

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
    // node callbacks fire first, the exec callback fires last, all asynchronously (setTimeout 0)
  });
```

- Supports `select` / `selectAll` / `selectViewport` / `in`, plus `boundingClientRect` / `scrollOffset` / `fields` / `node` / `context` / `ref`.
- `fields` supports `id` / `dataset` / `rect` / `size` / `scrollOffset` / `node` / `context` / `ref` / `properties`; the `fields` object in a fixture overrides / supplements the result.

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

observer.takeRecords(); // records that fired but have not been taken
observer.disconnect(); // no more callbacks afterwards
```

- `mockWx.intersection(selector, result?)` only triggers observers listening to the same selector; callbacks are asynchronous (setTimeout 0).
- `relativeTo` / `relativeToViewport` are only recorded and do not participate in geometry calculation.

> Fixtures match selectors **exactly**; class / descendant selectors are not parsed and no layout engine is simulated; `in(component)` still shares the global fixture registry.

## System info / network status / env

`wx.getSystemInfo(Sync)` / `getWindowInfo` / `getDeviceInfo` / `getAppBaseInfo` / `getSystemSetting` / `getAppAuthorizeSetting` are now generated from the same `mockWx.system()` configuration, with consistent fields and units.

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
  userDataPath: "wxfile://usr", // also updates wx.env.USER_DATA_PATH and the file system root
});
```

- Defaults: `platform = "devtools"`, `brand = "devtools"`, `model = "test"`, `system = "macOS 14.0"`, `SDKVersion = "3.8.0"`, `version = "8.0.0"`, window 375×667, `pixelRatio = 2`, `statusBarHeight = 20`.
- `safeArea` is derived from `statusBarHeight` / the window size when not configured; `getWindowInfo().screenTop` is 0.
- `getSystemInfo` returns 32 official fields + `theme`; `getSystemInfoSync` is consistent with the async version (the async one has an extra `errMsg`).
- By default `wx.env.USER_DATA_PATH = "wxfile://usr"` (the real-device value; DevTools may show `http://usr`, and the file APIs accept both schemes), `wx.version = "8.0.30"`.
- `mockWx.auth({ scope: false })` is reflected in both `getAppAuthorizeSetting()` and `getSystemInfo().*Authorized` (scopes that are not configured are authorized by default, keeping the old behaviour).

### Network status

```ts
mockWx.network({
  networkType: "4g", // wifi / 2g / 3g / 4g / 5g / none / unknown
  signalStrength: 42, // iOS 0~1, other platforms 0~100; derived from platform when not configured
  weakNet: true,
  offline: true, // equivalent to networkType: "none"
});

wx.onNetworkStatusChange(({ isConnected, networkType }) => {});
mockWx.network({ networkType: "5g" }); // dispatches an event when it changes
```

- `getNetworkType` returns `networkType` / `signalStrength` / `weakNet`; `getConnectedWifi`'s `signalStrength` uses the same configuration.
- The default platform is `devtools`, and `signalStrength` defaults to `100` (the iOS platform default is 1, consistent with how consumers such as report judge units).
- `onNetworkStatusChange` is only dispatched when the network type / connection state actually changes; go offline with `offline: true` or `networkType: "none"`.
- `mockWx.scope()` / `reset()` restore system / network / `USER_DATA_PATH`.

### Generic APIs (A2 batch 1)

Besides system info, the following generic APIs are also implemented:

- **Basic utilities**: `base64ToArrayBuffer` / `arrayBufferToBase64` / `getRandomValues`.
- **System / config**: `getSystemInfoAsync` (same source as `getSystemInfoSync`), `getSkylineInfo(Sync)`, `getApiCategory`, `getDeviceBenchmarkInfo`, `getRendererUserAgent`, `getCommonConfig`, `getExtConfig(Sync)`.
- **Performance**: `getPerformance` (`getEntries*` / `now` / `timeOrigin` / `setBufferSize` / `createObserver` stubs), `reportPerformance`, `reportMonitor`, `requestIdleCallback` / `cancelIdleCallback` (async callbacks, cancellable with `cancelIdleCallback`).
- **Page**: `enableAlertBeforeUnload` / `disableAlertBeforeUnload`, `showNavigationBarLoading` / `hideNavigationBarLoading`, `startPullDownRefresh`, `setTopBarText`, `rewriteRoute`.

```ts
const base64 = wx.arrayBufferToBase64(new Uint8Array([0, 1, 2]).buffer);
const bytes = wx.base64ToArrayBuffer(base64);

await wx.getSystemInfoAsync({});
await wx.getRendererUserAgent(); // "Mozilla/5.0 ... MicroMessenger/8.0.30"

mockWx.system({
  apiCategory: "native",
  benchmark: { benchmarkLevel: 30, modelLevel: 1 },
  extConfig: { channel: "test" },
  rendererUserAgent: "custom-agent",
  skyline: { isSupported: true, version: "0.9.7" },
});

wx.requestIdleCallback(({ timeRemaining }) => {
  timeRemaining();
});
```

> The failure branches of these APIs also support `mockWx.failNext(...)` injection; `canIUse` returns `true` for them. Media / sharing / audio APIs are covered in the next PR.

### Media / sharing / audio (A2 batch 2)

- **Media**: `chooseAddress` / `chooseContact` / `chooseInvoice` / `chooseInvoiceTitle` / `choosePoi` (return built-in mock choices), `previewMedia`, `compressVideo` / `cropImage` / `editImage` / `openVideoEditor` (return `mock://tmp/...` temporary paths), `saveFileToDisk`, `openPrivacyContract`.
- **Sharing / mini-program lifecycle**: `shareAppMessageToGroup`, `shareEmojiToGroup`, `shareFileMessage`, `shareFileToGroup`, `shareImageToGroup`, `shareToOfficialAccount`, `shareToWeRun`, `shareVideoMessage`, `shareVideoToGroup`, `restartMiniProgram`, `updateWeChatApp`, `exitMiniProgram`, `postMessageToReferrerPage`, `postMessageToReferrerMiniProgram`.
- **Audio**: `playVoice` / `pauseVoice` / `stopVoice`, `playBackgroundAudio` / `pauseBackgroundAudio` / `stopBackgroundAudio` / `seekBackgroundAudio`, `getBackgroundAudioPlayerState`, `setInnerAudioOption`, `getAvailableAudioSources`, `getAudioFileInfo`, `startRecord` / `stopRecord`.

```ts
await wx.chooseAddress({});
await wx.compressVideo({ src: "a.mp4" }); // { tempFilePath: "mock://tmp/compressed.mp4" }
await wx.playVoice({ filePath: "a.mp3" });
await wx.getBackgroundAudioPlayerState({}); // { status: 0, downloadPercent: 100, ... }

mockWx.failNext("chooseAddress", { type: "cancel" });
```

- Media selection APIs return fixed sample data (address, contact, invoice, POI); compression / cropping / editing only return mock temporary paths and do not process real files.
- Audio APIs only guarantee callback / field shapes and do not play real audio; `startRecord` succeeds immediately and `stopRecord` returns a mock temporary path.
- Failure / cancel branches also support `mockWx.failNext`, and `canIUse` returns `true` for them.

### canIUse / nextTick

```ts
wx.canIUse("request"); // true
wx.canIUse("totallyNotAnApi.method"); // false
wx.canIUse("openBluetoothAdapter"); // false (non-target API)

wx.nextTick(() => {}); // runs in the next tick (no longer synchronous)
```

## A3 manager stubs / A4 non-goals / coverage guard

### A3 manager stubs (creatable, complete methods, events can be registered)

The following factories / managers have been added: `createAnimation`, `createCameraContext`, `createMediaRecorder`, `createWebAudioContext`, `createAudioContext`, `createVideoDecoder`, `createWorker`, `createOffscreenCanvas`, `createTCPSocket` / `createUDPSocket`, `createBufferURL` / `revokeBufferURL`, `createCacheManager`, `getPluginUpdateManager`, `getUserCryptoManager`, `loadFontFace` / `loadBuiltInFontFace`, `preDownloadSubpackage` / `preloadAssets` / `preloadWebview` / `preloadSkylineView`, `openEmbeddedMiniProgram`.

```ts
const animation = wx.createAnimation({ duration: 100 });

animation.translate(10, 20).opacity(0).step().export();

const recorder = wx.createMediaRecorder();

recorder.onStart(() => {});
mockWx.emit("mediaRecorderStart");

const worker = wx.createWorker("worker.js");

worker.onMessage((message) => {});
mockWx.emit("workerMessage", { message: "hi" });

const cache = wx.createCacheManager();

cache.set("key", "value");
cache.get("key"); // "value"
```

- Manager events (`cameraFrame`, `mediaRecorder*`, `workerMessage`, `socketMessage`, `pluginUpdate*`) are triggered with `mockWx.emit(<event name>, ...)`, consistent with the generic event bus.
- Only "can be created, methods exist, callback / event shapes are correct" is guaranteed; no real rendering, audio / video, Worker, Socket protocol or cache persistence is implemented.

### A4 non-goals (explicitly not mocked)

The following APIs are hardware / ecosystem capabilities that the mock **does not implement**; `canIUse` returns `false` and no success is faked:

- Bluetooth / BLE, Beacon, NFC / HCE / transit cards, Secure Element / payment cards;
- Channels / live streaming / ads, official accounts / emoji / stickers, chat tools;
- Payment / coupons / stores / offline payment, Employee / device VoIP, SOTER / face / VK / XR, etc.

The complete list is in `packages/mock/src/unsupported.ts`: `A4_UNSUPPORTED_APIS` (97) and `DEFERRED_APIS` (24, the long tail such as channels / chat tools / calendar); the two are merged into `UNSUPPORTED_APIS` (121). There is also `MOCK_ONLY_APIS` (15), listing APIs the mock exposes but typings do not have (or no longer have), such as `getFileInfo`, `saveFile`, `getSavedFileList`, `showKeyboard`, `offSocket*`.

### Coverage guard

`packages/mock/__tests__/coverage.spec.ts` parses `interface Wx` from `miniprogram-api-typings`:

- asserts that "typings methods − `Object.keys(wx)`" **exactly equals** `UNSUPPORTED_APIS`;
- asserts that "`Object.keys(wx)` − typings methods" **exactly equals** `MOCK_ONLY_APIS`;
- asserts that `canIUse` returns `false` for every entry in `UNSUPPORTED_APIS` and `true` for implemented APIs.

When a typings upgrade adds or removes methods, this test turns red, making "add APIs / update the allowlist" an explicit action.

## Event listeners and manual triggering

The `wx` event-listener APIs (such as `onThemeChange`, `onAppShow`, `onWindowResize`) **do not fire automatically** by default; you need to trigger them manually through the exported `emitEvent` to simulate real scenarios:

```ts
import { emitEvent, wx } from "@mptool/mock";

const listener = vi.fn();

wx.onThemeChange(listener);
emitEvent("themeChange", { theme: "dark" });

expect(listener).toHaveBeenCalledWith({ theme: "dark" });
```

Events that support manual triggering:

| Listener API                 | Event name                 | Example payload                              |
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

`off*` APIs remove the corresponding listener when a listener function is passed, and remove all listeners for that event when no argument is passed.

### Full event API (A1)

Besides the table above, every event pair declared by `interface Wx` in `miniprogram-api-typings` has been added (71 `onXxx` in total, 62 of which have a matching `offXxx`), including `onError`, `onUnhandledRejection`, `onPageNotFound`, `onMemoryWarning`, `onAppRoute`, `onBeforePageLoad` / `onAfterPageLoad`, `onBLEConnectionStateChange`, `onBeaconUpdate`, `onVoIPChatStateChanged`, `onWifiConnected`, `onKeyDown` / `onKeyUp`, `onScreenRecordingStateChanged`, etc.

- The event name is the suffix after removing `on`, with the first letter lowercased; consecutive uppercase abbreviations are lowercased following common reading (`BLE`→`ble`, `VoIP`→`voip`, `HCE`→`hce`, `NFC`→`nfc`, `SOTER`→`soter`, `WiFi`→`wifi`).
- Trigger with `mockWx.emit(<event name>, ...args)`; `offXxx()` without a listener clears all listeners for that event.
- Events without a matching `offXxx` (such as `onError`) can only be registered; isolate tests with `mockWx.reset()` or `scope()`.

### Event trigger timing

The following events are wired into the mock's real behaviour and do not need a manual `emit`:

| Event                   | Trigger timing                                                                                                                                        | payload                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `onPageNotFound`        | when the target page of `navigateTo` / `redirectTo` / `switchTab` / `reLaunch` is not registered (the navigation failure callback is still preserved) | `{ path, query, isEntryPage: false }` (`path` has a leading `/`) |
| `onBeforeAppRoute`      | after a successful navigation, before page lifecycles                                                                                                 | `{ path, query, openType }`                                      |
| `onAppRoute`            | after a successful navigation and the target page has opened (`onLoad` / `onShow` / `onReady`)                                                        | `{ path, query, openType }`                                      |
| `onAppRouteDone`        | after a successful navigation and the `success` / `complete` callbacks                                                                                | `{ path, query, openType }`                                      |
| `onNetworkStatusChange` | when `mockWx.network()` changed the network type / connection state                                                                                   | `{ isConnected, networkType }`                                   |
| `onWifiConnected`       | when `mockWx.network()` switches to `wifi`                                                                                                            | `{ wifi }` (consistent with `getConnectedWifi`)                  |
| `onNetworkWeakChange`   | when `mockWx.network({ weakNet })` changes                                                                                                            | `{ networkType, weakNet }`                                       |
| `onGetWifiList`         | after calling `wx.getWifiList()`                                                                                                                      | `{ wifiList }` (`mockWx.network({ wifiList })`)                  |
| `onUnhandledRejection`  | `mockWx.unhandledRejection(reason, promise?)`                                                                                                         | `{ reason, promise }`                                            |
| `onMemoryWarning`       | `mockWx.memoryWarning(level?)`                                                                                                                        | `{ level }` (default 10)                                         |
| `onError`               | `mockWx.error(message)`                                                                                                                               | `message` (string)                                               |

`openType` is `navigateTo` / `redirectTo` / `switchTab` / `reLaunch` / `navigateBack`.

```ts
const calls: string[] = [];

wx.onBeforeAppRoute(({ openType }) => calls.push(`before:${openType}`));
wx.onAppRoute(({ openType }) => calls.push(`route:${openType}`));
wx.onAppRouteDone(({ openType }) => calls.push(`done:${openType}`));

await wx.navigateTo({ url: "/pages/detail?id=1" });

// calls: before:navigateTo → route:navigateTo → done:navigateTo

mockWx.unhandledRejection("boom", Promise.resolve());
mockWx.memoryWarning(15);
mockWx.error("script error");
```

> Other events (hardware or platform events such as BLE / Beacon / VoIP / sensors / keyboard / screen recording) are still triggered manually with `mockWx.emit(<event name>, ...)`; the mock does not fake hardware behaviour that has no real source.

```ts
wx.onError((error) => {
  console.log(error);
});

mockWx.emit("error", "boom");

wx.onBLEConnectionStateChange(listener);
mockWx.emit("bleConnectionStateChange", { deviceId: "d1", connected: true });
```

## Manager objects

Common managers such as `wx.createInnerAudioContext()`, `wx.createVideoContext()`, `wx.createCanvasContext()` and `wx.getRecorderManager()` return callable objects; A3's `createAnimation` / `createCameraContext` / `createMediaRecorder` / `createWorker` / socket / cache manager also have stub implementations (creatable, complete methods, events can be registered), see [A3 manager stubs](#a3-manager-stubs-creatable-complete-methods-events-can-be-registered).

```ts
const audio = wx.createInnerAudioContext();

audio.src = "https://example.com/a.mp3";
audio.play();
audio.pause();
```

## Storage and file system

- The `wx` storage APIs (`getStorage` / `setStorage` / `getStorageSync`, etc.) are implemented in memory and can be cleared between tests with `wx.clearStorageSync()`.
- `wx.getFileSystemManager()` returns an in-memory file-system manager supporting `readFileSync` / `writeFileSync` / `mkdirSync` / `statSync` and other operations.

## Supported scope

| Area                                 | Status           | Notes                                                                                                                                                             |
| ------------------------------------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Common `wx` APIs                     | supported        | storage, FSM, routing / page stack, UI / permissions / clipboard, network / system info, update, events, A2 generic APIs, A3 manager stubs                        |
| Page lifecycle                       | partially mocked | `onLoad` / `onShow` / `onReady` / `onHide` / `onUnload` fire synchronously in navigation order; rendering, animations and background lifecycles are not simulated |
| Network / system info                | supported        | configurable type, signal strength, weak network, system fields and authorization state                                                                           |
| WXML / SelectorQuery                 | partially mocked | node fixtures + async `exec`; no real layout engine or selector parsing                                                                                           |
| Compression / decompression / digest | partially mocked | `unzip` uses a JSON entry table; `getFileInfo().digest` is a placeholder; `readCompressedFile` does not really decompress                                         |
| Hardware / ecosystem APIs            | non-goal         | BLE, Beacon, NFC / HCE / transit cards, payment, Channels / live / ads, VoIP, SOTER / face / VK / XR, etc., see `A4_UNSUPPORTED_APIS`                             |
| Channel / chat / calendar long tail  | non-goal         | see `DEFERRED_APIS`; both are merged into `UNSUPPORTED_APIS`, and `canIUse` returns false                                                                         |

The non-goal list is maintained in `packages/mock/src/unsupported.ts` and is strictly compared against typings by `packages/mock/__tests__/coverage.spec.ts`.

## Differences from DevTools / real devices and known limitations

- **`USER_DATA_PATH`**: the mock uses the real-device value `wxfile://usr`; DevTools may show `http://usr`. The file system accepts both the `wxfile://` and `http://` schemes.
- **File system**: async failure results additionally expose `errCode` / `errno` (DevTools usually only has `errMsg`); messages follow the official error table and are not guaranteed to match DevTools word for word.
- **`unzip` / `readZipEntry`**: does not parse real zip binaries; uses a JSON entry table (`{"a.txt":"a"}` or `{"a.bin":{"base64":"..."}}`); zip-slip is rejected.
- **`getFileInfo().digest`**: a deterministic placeholder hash, not usable as a real md5 / sha1 / sha256.
- **`readCompressedFile`**: ignores the compression algorithm and returns the file bytes directly (no Brotli decompression).
- **Events**: the event bus dispatches **synchronously** (real devices are asynchronous); `onPageNotFound` / routing events / network events are wired to real behaviour, while hardware events still need `mockWx.emit`.
- **Navigation**: `Page({ route })` and the `tabBar` marker are mock extensions; without `route`, matching uses `$name` and the last segment of the URL. Lifecycles run synchronously, without rendering timing or the enhance navigation lock.
- **`canIUse`**: decided by API name (implemented → true, non-goal → false), not a base-library capability matrix.
- **Managers**: only creation, method presence and callback / event shapes are guaranteed; no real rendering, audio / video, Worker, Socket protocol or canvas drawing is performed.
- **Network**: no real HTTP server is started; `request` / `downloadFile` / `uploadFile` build responses through `mockWx.route/respond/fail`, keeping the Task shape consistent with real devices.
- **System info**: defaults to `platform = devtools`, `brand = devtools`, `system = macOS 14.0`; override with `mockWx.system()`.
- **mock-only**: legacy APIs / properties such as `getFileInfo`, `saveFile`, `getSavedFileList`, `showKeyboard`, `offSocket*` still exist in the mock, but current typings may not declare them; see `MOCK_ONLY_APIS`.
- **Process side effects**: `mockWx` does not listen to the host `process`; trigger `unhandledRejection` / `memoryWarning` / `error` through explicit helpers.

## Migrating from the old mock

If your old tests use a hand-written `wx` mock or `vi.stubGlobal("wx", {...})`, you can migrate as follows; **replacing a single `wx.xxx` directly still works and has the highest priority**, but preferring `mockWx` preserves the real state and failure semantics.

| Old                                                                    | New                                                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `vi.stubGlobal("wx", { getStorage: ... })`                             | `import "@mptool/mock"` + `wx.setStorageSync(...)` / `mockWx.storage(...)`           |
| `wx.showModal = vi.fn(({ success }) => success({ confirm: false }))`   | `mockWx.user({ modal: "cancel" })`                                                   |
| `wx.getSetting = vi.fn(({ success }) => success({ authSetting: {} }))` | `mockWx.auth({})` / `mockWx.authorize("deny")`                                       |
| `wx.authorize = vi.fn(({ fail }) => fail())`                           | `mockWx.authorize("deny")` or `mockWx.failNext("authorize", { type: "permission" })` |
| `wx.getNetworkType = vi.fn(...)`                                       | `mockWx.network({ networkType: "4g" })`                                              |
| `wx.getSystemInfoSync = vi.fn(...)`                                    | `mockWx.system({ platform: "ios", ... })`                                            |
| hand-written request response / failure                                | `mockWx.route()` / `mockWx.respond()` / `mockWx.fail()`                              |
| manual `emitEvent("networkStatusChange")`                              | dispatched automatically by `mockWx.network(...)`                                    |
| manually building the page stack / replacing `wx.navigateTo`           | `Page({ route })` + real `wx.navigateTo` / `wx.navigateBack`                         |
| manually replacing `wx.createSelectorQuery`                            | `mockWx.node()` + the real `SelectorQuery`                                           |

```ts
// before
const original = wx.showModal;

wx.showModal = ({ success }) => success({ confirm: false });
// afterEach: wx.showModal = original

// after
import "@mptool/mock";
import { mockWx } from "@mptool/mock";

mockWx.user({ modal: "cancel" });
```

> Do not replace the whole object with `vi.stubGlobal("wx", ...)`: the module has already captured the mock's `wx` reference, so replacing the global object makes the two diverge. Prefer `mockWx` when you need precise results, and replace individual methods only when necessary.
