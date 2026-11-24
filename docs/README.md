---
home: true
title: 主页
heroImage: /logo.svg
actions:
  - text: 快速上手
    link: /guide.html
    type: primary

features:
  - title: "@mptool/all"
    details: 全量包，把 api / enhance / file / net / parser / shared 的常用工具打成一个 ESM 文件
    link: /all/

  - title: "@mptool/skyline"
    details: Skyline 版全量包，汇总 net / skyline-enhance / file / parser
    link: /skyline/

  - title: "@mptool/enhance"
    details: 增强框架，提供 App / Page / Component 包装、额外生命周期扩展与事件打通
    link: /enhance/

  - title: "@mptool/skyline-enhance"
    details: enhance 的 Skyline 精简版，保留通信、引用与热更新
    link: /skyline-enhance/

  - title: "@mptool/net"
    details: 网络框架，Fetch 风格 API，并提供 Headers、URLSearchParams 与全自动 Cookie
    link: /net/

  - title: "@mptool/file"
    details: 文件与存储框架，自动处理路径、过期清理以及下载解压等复杂逻辑
    link: /file/

  - title: "@mptool/api"
    details: 通用 API 封装，涵盖剪贴板、权限、页面信息、媒体与 UI
    link: /api/

  - title: "@mptool/parser"
    details: HTML 解析器，把 HTML 转换为 rich-text 节点
    link: /parser/

  - title: "@mptool/run"
    details: 自定义 JS 解释器，在小程序中执行动态代码，替代被禁用的 eval 与 new Function
    link: /run/

  - title: "@mptool/encoder"
    details: 支持 UTF-8 / GBK / GB18030 的 TextEncoder 与 TextDecoder
    link: /encoder/

  - title: "@mptool/shared"
    details: 各包共用的基础工具，如 Emitter、logger、query、lock 与 base64 辅助
    link: /shared/

  - title: "@mptool/mock"
    details: wx API 模拟，在 Node.js / vitest 中直接运行小程序代码
    link: /mock/

footer: 使用 <a href="https://theme-hope.vuejs.press/zh/" target="_blank">VuePress Theme Hope</a> 主题
---
