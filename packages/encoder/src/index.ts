// oxlint-disable-next-line import/no-unassigned-import
import "./implements/index.js";
import { decoders } from "./textDecoder.js";
import { encoders } from "./textEncoder.js";

// The side-effect import above registered the built-in codecs. Freeze both registries afterwards so
// a consumer cannot silently replace a codec (e.g. `decoders.GBK = ...`), which would change the
// behaviour of every decoder in the process. They stay exported for backwards compatibility, but
// custom codecs are not supported.
//
// 副作用 import 已完成内置编解码器注册；随后冻结注册表，避免使用方在运行时替换编解码器。
Object.freeze(decoders);
Object.freeze(encoders);

export * from "./textDecoder.js";
export * from "./textEncoder.js";
