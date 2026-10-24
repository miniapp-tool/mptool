# miniapp tool

[![Author: Mr.Hope](https://img.shields.io/badge/作者-Mr.Hope-blue.svg?style=for-the-badge)](https://mister-hope.com) [![License](https://img.shields.io/npm/l/@mptool/enhance.svg?style=for-the-badge)](https://github.com/miniapp-tool/mptool/blob/main/LICENSE)

<!-- markdownlint-restore -->

[![Version](https://img.shields.io/npm/v/@mptool/enhance.svg?style=flat-square&logo=npm) ![Downloads](https://img.shields.io/npm/dm/@mptool/enhance.svg?style=flat-square&logo=npm) ![Size](https://img.shields.io/bundlephobia/min/@mptool/enhance?style=flat-square&logo=npm)](https://www.npmjs.com/package/@mptool/enhance)

[![DeepScan grade](https://deepscan.io/api/teams/9792/projects/17760/branches/417299/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=9792&pid=17760&bid=417299)
![CodeQL](https://github.com/miniapp-tool/mptool/actions/workflows/codeql-analysis.yml/badge.svg)
[![codecov](https://codecov.io/gh/miniapp-tool/mptool/branch/main/graph/badge.svg?token=TNYMbGlxQ9)](https://codecov.io/gh/miniapp-tool/mptool)
![Test](https://github.com/miniapp-tool/mptool/actions/workflows/test.yml/badge.svg)

轻量的小程序增强框架。

- [x] @mptool/mock: wx API 模拟（W.I.P）
- [x] @mptool/enhance: 通信框架（稳定）
  - 打通任意页面和组件之间的通信
  - 额外的生命周期，支持页面间互相调用进行预加载处理
  - 组件与页面之间的相互引用
  - 支持热更新页面逻辑（配合 `@mptool/run` 与 `@mptool/all` 使用）

- [x] @mptool/file: 文件与存储 API（稳定）
  - 为缓存数据设置有效期
  - Node.js 风格的创建文件夹
  - 解压文件接口
  - 保存在线文件

- [x] @mptool/api: 通用 API 封装（稳定）

- [x] @mptool/encoder: UTF-8 / GBK / GB18030 的编码支持（稳定）

- [x] @mptool/net: 小程序网络 API（稳定）
  - Headers
  - URLSearchParams
  - 自动解析并携带 Cookie

- [x] @mptool/parser: HTML 解析器（稳定）

- [x] @mptool/run: 自定义 JS 解释器，替代被禁用的 `eval` 与 `new Function`（稳定）
  - 不包含在 `@mptool/all` / `@mptool/skyline` 全量包中，需单独引入

- [x] @mptool/all: 全量包（api + enhance + file + net + parser）
- [x] @mptool/skyline: Skyline（基础库 3.0+）全量包（net + skyline-enhance + file + parser）

## 感谢

此项目受到 [wxpage](https://github.com/tvfe/wxpage)、 [jsjs](https://github.com/bramblex/jsjs) 和 [weapp-cookie](https://github.com/charleslo1/weapp-cookie) 的极大激发！致以由衷地感谢。❤
