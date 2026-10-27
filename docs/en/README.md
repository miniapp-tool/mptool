---
home: true
title: Home
icon: home
heroImage: /logo.svg
actions:
  - text: 💡 Quick start
    link: /en/guide/
    type: primary

highlights:
  - header: "@mptool/enhance"
    description: Communication framework
    highlights:
      - title: Enhanced app startup
        icon: rocket
        details: Extra lifecycles let you run any preloading work you want while the app starts or a page registers

      - title: Extra lifecycle extensions
        icon: circle-plus
        details: You can trigger preloading of other pages at any time, or notify the target page to prepare data during navigation

      - title: Lightweight
        icon: bolt
        details: Less than 10 kb

      - title: References
        icon: route
        details: Reference pointers between parent and child components, and between components and pages, allow direct access

      - title: Unified events
        icon: flag
        details: Fully connects components, pages and the app. You can communicate or trigger events from almost anywhere

  - header: "@mptool/file"
    description: File and storage framework
    highlights:
      - title: Automatic path handling
        icon: wand-sparkles
        details: Paths are handled automatically, creating parent folders or overwriting files.

      - title: Expiration support
        icon: stopwatch
        details: Set a lifetime for stored data and expired entries are cleaned up automatically.

      - title: Complex logic encapsulated
        icon: object-group
        details: Wrappers for complex logic such as downloading files, unzipping archives and saving online files.

  - header: "@mptool/net"
    description: Networking framework
    highlights:
      - title: Fetch API
        icon: wifi
        details: Fetch-style API that also provides Headers and URLSearchParams

      - title: Cookie support
        icon: cookie
        details: Cookies are saved and attached fully automatically

  - header: "@mptool/parser"
    description: HTML parser

  - header: "@mptool/api"
    description: General API wrappers

  - header: "@mptool/encoder"
    description: Encoder with UTF-8 / GBK / GB18030 support

  - header: "@mptool/run"
    description: Custom JS interpreter
    highlights:
      - title: Dynamic execution
        icon: play
        details: Execute dynamically delivered code in WeChat mini-programs, replacing the disabled `eval` and `new Function`

      - title: Syntax support
        icon: code
        details: All of ES5 plus common ES6 syntax, including `let/const`, arrow functions, template literals, destructuring, `class`, `async/await` and more

      - title: Built-in delegation
        icon: box
        details: Built-in objects all reuse the host runtime, so every prototype and static method the host supports is available

      - title: Lightweight
        icon: bolt
        details: Only about 202 kb in size

footer: Using the <a href="https://theme-hope.vuejs.press/zh/" target="_blank">VuePress Theme Hope</a> theme
---
