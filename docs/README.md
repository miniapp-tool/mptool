---
home: true
title: 主页
icon: home
heroImage: /logo.svg
actions:
  - text: 💡 快速上手
    link: /guide/
    type: primary

highlights:
  - header: "@mptool/enhance"
    description: 通信框架
    highlights:
      - title: APP 启动增强
        icon: rocket
        details: 额外的周期允许你在 APP 启动时或页面注册时进行你想要的预加载操作

      - title: 额外的生命周期扩展
        icon: circle-plus
        details: 你可以在随时触发其他页面的预加载，或在跳转时通知被跳转页准备数据

      - title: 轻量
        icon: bolt
        details: < 10 kb 的大小

      - title: 引用
        icon: route
        details: 为父子组件、组件和页面间添加引用指针，以允许直接操作

      - title: 事件打通
        icon: flag
        details: 完全打通组件、页面与 APP 之间的通信。你可以几乎在任意位置间进行通信或触发事件

  - header: "@mptool/file"
    description: 文件与存储框架
    highlights:
      - title: 路径自动处理
        icon: wand-sparkles
        details: 自动处理路径，创建父文件夹或覆盖文件。

      - title: 设置有效期
        icon: stopwatch
        details: 为存储的数据设置有效期，自动清理过期数据。

      - title: 复杂逻辑封装
        icon: object-group
        details: 下载文件、解压文件、保存在线文件等复杂逻辑的封装。

  - header: "@mptool/net"
    description: 网络框架
    highlights:
      - title: Fetch API
        icon: wifi
        details: Fetch 风格 API，同时提供 Headers 和 URLSearchParams

      - title: Cookie 支持
        icon: cookie
        details: 全自动保存并附加 Cookie

  - header: "@mptool/parser"
    description: HTML 解析器

  - header: "@mptool/api"
    description: 通用 API 封装

  - header: "@mptool/encoder"
    description: 支持 GBK 和 GB2312 的编码器

  - header: "@mptool/run"
    description: 自定义 JS 解释器
    highlights:
      - title: 动态执行
        icon: play
        details: 在微信小程序中执行动态下发的代码，替代被禁用的 `eval` 与 `new Function`

      - title: 语法支持
        icon: code
        details: ES5 全量 + 常用 ES6 语法，包括 `let/const`、箭头函数、模板字符串、解构赋值、`class`、`async/await` 等

      - title: 内建委托
        icon: box
        details: 内建对象全部复用宿主运行时，宿主支持的原型与静态方法均可用

      - title: 轻量
        icon: bolt
        details: 压缩后仅 44 kb

footer: 使用 <a href="https://theme-hope.vuejs.press/zh/" target="_blank">VuePress Theme Hope</a> 主题
---
