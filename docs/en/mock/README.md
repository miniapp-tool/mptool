---
title: "@mptool/mock"
icon: flask
---

`wx` API mock for running mini-program code under Node.js / vitest. It implements stateful storage, file-system, routing, permission, network and system-info semantics, and exposes a `mockWx` control plane for failure injection, user decisions and presets.

## Install

```bash
pnpm add -D @mptool/mock
```

## Quick start

Import it once from your test setup (for example `vitest.setup.ts`):

```ts
import "@mptool/mock";
```

This installs `Page` / `App` / `Component` / `Behavior` / `getCurrentPages` on `globalThis`, installs the global `wx` object, and exports the same `wx` plus the `mockWx` control plane.

```ts
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

`mockWx.reset()` restores the default environment (storage, FSM, events, page stack, system, network, `USER_DATA_PATH`, replaced `wx` methods). Use it in `beforeEach`.

For narrow changes use a scope, which only restores what changed inside it:

```ts
const scope = mockWx.scope();

mockWx.network({ networkType: "4g" });
// ...
scope.restore();
```

`mockWx.autoRestore(afterEach)` and `mockWx.run(callback)` provide the same behaviour for frameworks with `afterEach`.

## Calling conventions

### Callback-style APIs

Without callbacks the mock returns a `Promise`; with `success` / `complete` callbacks they are invoked asynchronously:

```ts
await wx.showToast({ title: "hi" }); // Promise style

wx.showToast({ title: "hi", success: () => console.log("done") }); // callback style
```

### Task-returning APIs

Like the real runtime, `wx.request` **always returns a `RequestTask`** and does not support Promise style. Use the task to abort:

```ts
const task = wx.request({
  url: "https://example.com/api",
  success: (res) => console.log(res.statusCode),
  fail: ({ errMsg }) => console.error(errMsg),
});

task.abort(); // fail receives "request:fail abort"
```

Use `mockWx.fail()` / `respond()` / `route()` for network failures, timeouts and custom responses. `respond()` / `route()` support `delay` for slow responses; the mock does not auto-timeout from `option.timeout` — use `mockWx.failNext("request", { type: "timeout" })` to exercise that branch.

`downloadFile` / `uploadFile` also return tasks. The mock does not emit real progress; `abort` and failure injection work.

### Synchronous APIs

`wx.getWindowInfo`, `wx.getStorageSync`, etc. return values directly.

## Common scenarios

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

Supported failure types: `network`, `timeout`, `abort`, `quota`, `noent`, `permission`, `cancel`, `fail` (custom `errMsg`) and `throw` (sync APIs throw the given `Error`).

### User decisions / permissions

```ts
mockWx.user({ modal: "cancel", actionSheet: 1, payment: "cancel" });
mockWx.auth({ "scope.camera": false });
mockWx.authorize("deny");
mockWx.clipboard("copied");
```

### Network / system info

```ts
mockWx.network({ networkType: "4g", signalStrength: 42, weakNet: true });
mockWx.system({ platform: "ios", brand: "Apple", windowWidth: 414, windowHeight: 896 });
```

### Storage and file system

```ts
wx.setStorageSync("key", { a: 1 });
mockWx.storage({ limitSize: 1 }); // KB, useful for quota tests

const fs = wx.getFileSystemManager();
fs.mkdirSync(`${wx.env.USER_DATA_PATH}/tmp`, true);
fs.writeFileSync(`${wx.env.USER_DATA_PATH}/tmp/a.txt`, "hello");
fs.readFileSync(`${wx.env.USER_DATA_PATH}/tmp/a.txt`, "utf-8"); // "hello"
```

### Page stack and events

```ts
Page({ route: "/pages/detail", onLoad() {} });

await wx.navigateTo({ url: "/pages/detail?id=1" });
getCurrentPages(); // [{ route: "/pages/detail", ... }]

wx.onThemeChange(listener);
mockWx.emit("themeChange", { theme: "dark" });

// A failed navigation emits onPageNotFound automatically.
```

### WXML fixtures / SelectorQuery

```ts
mockWx.node("#card", { left: 0, top: 0, width: 300, height: 120 });

wx.createSelectorQuery()
  .select("#card")
  .boundingClientRect((rect) => console.log(rect))
  .exec();
```

## `mockWx` control plane

`mockWx` controls **when** and **how** an API fails or returns a custom result. `wx` remains a mutable object: assigning `wx.request = vi.fn()` still wins and bypasses injection rules.

```ts
mockWx.failNext("getNetworkType", { type: "network" }); // next call only
mockWx.fail("request", { type: "timeout" }, { times: 2 }); // first two calls
mockWx.failSequence("getNetworkType", [{ type: "network" }, { type: "timeout" }]);
mockWx.respond("getWindowInfo", { windowWidth: 320 });
mockWx.route({
  "GET https://api.example.com/user": { statusCode: 200, data: { name: "hope" } },
  "POST https://api.example.com/pay": { statusCode: 502, data: { error: "bad gateway" } },
  "/^https:\\/\\/api\\.example\\.com\\/v\\d+\\//": { statusCode: 204 },
  "GET https://api.example.com/slow": { delay: 100, statusCode: 200 },
});

mockWx.calls("showToast"); // recorded calls
```

## Supported scope

| Area                                | Status    | Notes                                                                                                                                          |
| ----------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Common `wx` APIs                    | supported | storage, FSM, routing/page stack, UI/permissions/clipboard, network/system info, update, events, A2 generic APIs, A3 manager stubs             |
| Page lifecycle                      | partial   | `onLoad` / `onShow` / `onReady` / `onHide` / `onUnload` run synchronously in navigation order; no rendering, animation or background lifecycle |
| WXML / SelectorQuery                | partial   | node fixtures + async `exec`; no real layout engine or selector parsing                                                                        |
| Zip / digest                        | partial   | `unzip` uses a JSON entry table; `getFileInfo().digest` is a placeholder; `readCompressedFile` does not decompress                             |
| Hardware / ecosystem APIs           | non-goal  | BLE, Beacon, NFC/HCE/transit cards, payment, channels/live/ads, VoIP, SOTER/face/VK/XR — see `A4_UNSUPPORTED_APIS`                             |
| Channel / chat / calendar long tail | non-goal  | see `DEFERRED_APIS`; merged into `UNSUPPORTED_APIS`, `canIUse` returns false                                                                   |

The non-target list lives in `packages/mock/src/unsupported.ts` and is checked against typings by the mock test suite.

## Differences from DevTools / real devices

- **`USER_DATA_PATH`**: the mock uses `wxfile://usr` (real device); DevTools may show `http://usr`. The FS accepts both schemes.
- **File system**: async failures expose extra `errCode` / `errno` (DevTools usually only has `errMsg`); messages follow the official error table, not necessarily DevTools wording.
- **`unzip` / `readZipEntry`**: does not parse real zip binaries; uses a JSON entry table. Zip-slip is rejected.
- **`getFileInfo().digest`**: deterministic placeholder, not real md5/sha1/sha256.
- **`readCompressedFile`**: ignores the compression algorithm and returns raw bytes.
- **Events**: dispatched **synchronously** (real runtime is asynchronous). Routing/network events are connected; hardware events must be fired with `mockWx.emit`.
- **Navigation**: `Page({ route })` and the `tabBar` marker are mock extensions; lifecycle runs synchronously, without rendering timing or the enhance navigation lock.
- **`canIUse`**: based on the API name (implemented → true, non-target → false), not a base-library capability matrix.
- **Managers**: only creation, method presence and callback/event shapes; no real rendering, media, Worker, Socket protocol or canvas.
- **Network**: no real HTTP server; construct responses with `mockWx.route/respond/fail`, while keeping Task shape.
- **System info**: defaults to `platform = devtools`, `brand = devtools`, `system = macOS 14.0`; override with `mockWx.system()`.
- **mock-only**: legacy APIs such as `getFileInfo`, `saveFile`, `getSavedFileList`, `showKeyboard`, `offSocket*` still exist; typings may not declare them — see `MOCK_ONLY_APIS`.
- **Process side effects**: `mockWx` does not listen to the host `process`; trigger `unhandledRejection` / `memoryWarning` / `error` through explicit helpers.

## Migrating from a hand-written mock

| Old                                                                  | New                                                                                  |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `vi.stubGlobal("wx", { getStorage: ... })`                           | `import "@mptool/mock"` + real `wx.setStorageSync(...)` / `mockWx.storage(...)`      |
| `wx.showModal = vi.fn(({ success }) => success({ confirm: false }))` | `mockWx.user({ modal: "cancel" })`                                                   |
| `wx.getSetting = vi.fn(...)`                                         | `mockWx.auth({})` / `mockWx.authorize("deny")`                                       |
| `wx.authorize = vi.fn(({ fail }) => fail())`                         | `mockWx.authorize("deny")` or `mockWx.failNext("authorize", { type: "permission" })` |
| hand-written request response                                        | `mockWx.route()` / `mockWx.respond()` / `mockWx.fail()`                              |
| manual page stack / `wx.navigateTo` replacement                      | `Page({ route })` + real `wx.navigateTo` / `wx.navigateBack`                         |

> Do not replace the whole `wx` object with `vi.stubGlobal`: modules capture a reference to the mock `wx`, so the global and the captured object diverge. Prefer `mockWx`; replace individual methods only when necessary.

## More

The full Chinese reference (`/mock/`) covers every scenario, manager stub and event.
