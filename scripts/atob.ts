// oxlint-disable no-bitwise
/* A tiny atob polyfill for miniapp environments (no global atob) */

const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const lookup = new Uint8Array(128);

for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;

export const atob = (input: string): string => {
  const clean = input.replace(/[^A-Za-z0-9+/]/gu, "");
  let output = "";

  for (let i = 0; i < clean.length; i += 4) {
    const b1 = lookup[clean.charCodeAt(i)];
    const b2 = lookup[clean.charCodeAt(i + 1)];
    const b3 = lookup[clean.charCodeAt(i + 2)];
    const b4 = lookup[clean.charCodeAt(i + 3)];

    output += String.fromCharCode((b1 << 2) | (b2 >> 4));
    if (b3 != null) output += String.fromCharCode(((b2 & 15) << 4) | (b3 >> 2));
    if (b4 != null) output += String.fromCharCode(((b3 & 3) << 6) | b4);
  }

  return output;
};
