# @mptool/encoder

Encoder/Decoder for Wechat miniapp.

`TextDecoder` supports UTF-8, GBK and GB18030 (GB2312 uses the GBK labels).

`TextEncoder` encodes UTF-8 by default. As a **non-standard extension** (WHATWG's `TextEncoder`
only supports UTF-8) it also accepts an encoding label for the other supported encodings:

```ts
new TextEncoder("gbk").encode("中文"); // Uint8Array [0xd6, 0xd0, 0xce, 0xc4]
new TextEncoder("gb18030").encode("中文");
```

`new TextEncoder(label)` throws a `RangeError` when the label is unknown, and the `encoding`
property reports the selected encoding (`"utf-8"`, `"gbk"` or `"gb18030"`).
