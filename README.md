# miniapp tool

[![Author: Mr.Hope](https://img.shields.io/badge/作者-Mr.Hope-blue.svg?style=for-the-badge)](https://mrhope.site) [![License](https://img.shields.io/npm/l/@mptool/enhance.svg?style=for-the-badge)](https://github.com/@mptool/enhance/@mptool/enhance/blob/main/LICENSE)

<!-- markdownlint-restore -->

[![Version](https://img.shields.io/npm/v/@mptool/enhance.svg?style=flat-square&logo=npm) ![Downloads](https://img.shields.io/npm/dm/@mptool/enhance.svg?style=flat-square&logo=npm) ![Size](https://img.shields.io/bundlephobia/min/@mptool/enhance?style=flat-square&logo=npm)](https://www.npmjs.com/package/@mptool/enhance)

[![DeepScan grade](https://deepscan.io/api/teams/9792/projects/17760/branches/417299/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=9792&pid=17760&bid=417299)
![CodeQL](https://github.com/miniapp-tool/mptool/actions/workflows/codeql-analysis.yml/badge.svg)
[![codecov](https://codecov.io/gh/miniapp-tool/mptool/branch/main/graph/badge.svg?token=TNYMbGlxQ9)](https://codecov.io/gh/miniapp-tool/mptool)
![Test](https://github.com/miniapp-tool/mptool/actions/workflows/test.yml/badge.svg)

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

## 感谢

此项目受到 [wxpage](https://github.com/tvfe/wxpage)、 [jsjs](https://github.com/bramblex/jsjs) 和 [weapp-cookie](https://github.com/charleslo1/weapp-cookie) 的极大激发！致以由衷地感谢。❤
