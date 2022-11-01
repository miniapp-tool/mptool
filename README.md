# miniapp tool

[![Author: Mr.Hope](https://img.shields.io/badge/作者-Mr.Hope-blue.svg?style=for-the-badge)](https://mrhope.site) [![License](https://img.shields.io/npm/l/@mptool/enhance.svg?style=for-the-badge)](https://github.com/@mptool/enhance/@mptool/enhance/blob/main/LICENSE)

<!-- markdownlint-restore -->

[![Version](https://img.shields.io/npm/v/@mptool/enhance.svg?style=flat-square&logo=npm) ![Downloads](https://img.shields.io/npm/dm/@mptool/enhance.svg?style=flat-square&logo=npm) ![Size](https://img.shields.io/bundlephobia/min/@mptool/enhance?style=flat-square&logo=npm)](https://www.npmjs.com/package/@mptool/enhance)

[![DeepScan grade](https://deepscan.io/api/teams/9792/projects/17760/branches/417299/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=9792&pid=17760&bid=417299)
![CodeQL](https://github.com/miniapp-tool/mptool/actions/workflows/codeql-analysis.yml/badge.svg)
[![codecov](https://codecov.io/gh/miniapp-tool/mptool/branch/main/graph/badge.svg?token=TNYMbGlxQ9)](https://codecov.io/gh/miniapp-tool/mptool)
![Test](https://github.com/miniapp-tool/mptool/actions/workflows/test.yml/badge.svg)

轻量的小程序增强框架。

- [x] @mptool/mock: wx API 的简单模拟 ![W.I.P](https://img.shields.io/badge/-W.I.P-red)
- [x] @mptool/file: 一套简单的文件与存储 API ![Alpha](https://img.shields.io/badge/-Alpha-yellow)
- [ ] @mptool/eval: 为小程序添加 eval ![Building](https://img.shields.io/badge/-Building-grey)
- [x] @mptool/enhance: 一套完整的通信框架 ![Alpha](https://img.shields.io/badge/-Alpha-yellow)

  - 打通任意页面和组件之间的通信
  - 额外的生命周期，支持页面间互相调用进行预加载处理
  - 组件与页面之间的相互引用
  - 支持热更新页面逻辑 (TODO)

## 感谢

此项目受到 [wxpage](https://github.com/tvfe/wxpage) 和 [jsjs](https://github.com/bramblex/jsjs) 的极大激发！致以由衷地感谢。❤
