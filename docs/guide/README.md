---
title: MP Tool
icon: lightbulb
---

轻量的小程序增强框架。

- [x] @mptool/mock: wx API 模拟 <Badge text="W.I.P" type="warning" />
- [x] @mptool/enhance: 通信框架 <Badge text="Stable" />

  - 打通任意页面和组件之间的通信
  - 额外的生命周期，支持页面间互相调用进行预加载处理
  - 组件与页面之间的相互引用
  - 支持热更新页面逻辑 (TODO)

- [x] @mptool/file: 文件与存储 API <Badge text="Stable" />

  - 为缓存数据设置有效期
  - Node.js 风格的创建文件夹、
  - 解压文件接口
  - 保存在线文件

- [x] @mptool/encoder: GBK 和 GB2312 的编码支持 <Badge text="Stable" />

- [x] @mptool/net: 小程序网络 API <Badge text="Stable" />

  - Headers
  - URLSearchParams
  - 自动解析并携带 Cookie

- [ ] @mptool/eval: 为小程序添加 eval <Badge text="Building" type="danger" />
