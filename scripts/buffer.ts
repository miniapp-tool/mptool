// oxlint-disable no-bitwise
/* A tiny Buffer implementation */

const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const lookup = new Uint8Array(256);

for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;

const base64ToBinaryString = (base64: string): string => {
  const cleanBase64 = base64.replace(/[\s=]/g, "");
  const len = cleanBase64.length;
  let bin = "";

  for (let i = 0; i < len; i += 4) {
    const b1 = lookup[cleanBase64.charCodeAt(i)];
    const b2 = lookup[cleanBase64.charCodeAt(i + 1)];
    const b3 = lookup[cleanBase64.charCodeAt(i + 2)];
    const b4 = lookup[cleanBase64.charCodeAt(i + 3)];

    bin += String.fromCharCode((b1 << 2) | (b2 >> 4));
    if (b3 != null) bin += String.fromCharCode(((b2 & 15) << 4) | (b3 >> 2));
    if (b4 != null) bin += String.fromCharCode(((b3 & 3) << 6) | b4);
  }
  return bin;
};

export const Buffer = {
  from(input: string, encoding: string) {
    if (encoding !== "base64") throw new Error("TinyBuffer: Only base64 input is supported");

    return {
      toString: (targetEncoding: string): string => {
        if (targetEncoding !== "binary")
          throw new Error(`TinyBuffer: Unsupported target encoding ${targetEncoding}`);

        return base64ToBinaryString(input);
      },
    };
  },
  isBuffer(_test: unknown): boolean {
    return false;
  },
} as unknown as Buffer;
