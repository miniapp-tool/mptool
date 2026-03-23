---
title: "@mptool/api"
icon: puzzle-piece
---

小程序通用 API 封装。

<!-- more -->

## clipboard

### writeClipboard

- 类型: `(data?: string) => Promise<void>`

- 参数:
  - `data`: 要写入剪贴板的内容

写入剪贴板内容。

## contact

### addContact

- 类型: `(config: Omit<WechatMiniprogram.AddPhoneContactOption, "success" | "fail" | "complete">) => Promise<void>`

- 参数:
  - `config`: 联系人信息配置

保存联系人到通讯录。

### getCurrentPage

- 类型: `<T extends Record<string, any>>() => (T & WechatMiniprogram.Page.TrivialInstance) | null`

获取当前页面实例。

### getCurrentRoute

- 类型: `() => string`

获取当前页面路径。

## compareVersion

### compareVersion

- 类型: `(versionA: string, versionB: string) => number`

- 参数:
  - `versionA`: 版本号 A
  - `versionB`: 版本号 B

- 返回值:
  - `1`: versionA > versionB
  - `0`: versionA = versionB
  - `-1`: versionA < versionB

比较两个版本号的大小。

## media

### openDocument

- 类型: `(url: string) => void`

- 参数:
  - `url`: 文档在线地址

打开并预览文档（自动下载后打开）。

### saveDocument

- 类型: `(url: string, filename?: string) => void`

- 参数:
  - `url`: 文档在线地址
  - `filename`: 保存的文件名（可选，默认从 URL 提取）

下载并保存文档到微信收藏。

### savePhoto

- 类型: `(imgPath: string) => Promise<void>`

- 参数:
  - `imgPath`: 图片地址

保存图片到相册（会自动请求权限）。

## network

### download

- 类型: `(url: string, mask?: boolean) => Promise<string>`

- 参数:
  - `url`: 下载路径
  - `mask`: 是否显示加载遮罩

下载文件，返回临时文件路径。

### reportNetworkStatus

- 类型: `() => void`

检测网络状态并显示提示。

## ui

### showModal

- 类型: `(title: string, content: string, confirmAction?: () => void | Promise<void>, cancelAction?: () => void | Promise<void>) => void`

- 参数:
  - `title`: 弹窗标题
  - `content`: 弹窗内容
  - `confirmAction`: 点击确定的回调
  - `cancelAction`: 点击取消的回调（不填则不显示取消按钮）

显示模态对话框。

### showToast

- 类型: `(title: string, duration?: number, icon?: "success" | "error" | "loading" | "none") => Promise<void>`

- 参数:
  - `title`: 提示文字
  - `duration`: 持续时间（默认 1500ms）
  - `icon`: 图标类型

显示轻提示。

### confirm

- 类型: `(text: string, confirmAction: () => Promise<void> | void, cancelAction?: () => void | Promise<void>, warning?: string) => void`

- 参数:
  - `text`: 行为描述文字
  - `confirmAction`: 确定回调
  - `cancelAction`: 取消回调（可选）
  - `warning`: 额外警告信息

显示操作确认对话框。

### retry

- 类型: `(title: string, content: string, retryAction: () => void | Promise<void>, navigateBack?: boolean) => void`

- 参数:
  - `title`: 弹窗标题
  - `content`: 弹窗内容
  - `retryAction`: 重试回调
  - `navigateBack`: 重试失败后是否返回上一页

显示重试对话框。

### getWindowInfo

- 类型: `() => WechatMiniprogram.WindowInfo`

获取窗口信息。

## update

### updateApp

- 类型: `(onUpdateReady: (applyUpdate: () => void) => Promise<void> | void) => void`

- 参数:
  - `onUpdateReady`: 检查到更新时的回调，接收一个 `applyUpdate` 函数用于应用更新

检查小程序更新并处理升级流程。
