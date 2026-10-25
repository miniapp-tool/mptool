# @mptool/skyline

All-in-one bundle for mptool, targeting the WeChat Skyline renderer (base library 3.0+).

It re-exports `@mptool/skyline-enhance`, `@mptool/net`, `@mptool/file`, `@mptool/parser` and the
commonly used `@mptool/shared` helpers, plus `installMptoolGlobals` / `mptoolGlobals` for
hot-reload code.

`@mptool/run` is not part of this bundle; import it separately and call `installGlobal()` when you
need page hot reload.

Docs: <https://miniapp-tool.github.io/skyline/>
