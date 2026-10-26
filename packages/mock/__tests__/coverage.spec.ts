import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { wx } from "../src/index.js";
import {
  A4_UNSUPPORTED_APIS,
  DEFERRED_APIS,
  MOCK_ONLY_APIS,
  UNSUPPORTED_APIS,
} from "../src/unsupported.js";

const TYPINGS_PATH = new URL(
  "../../../node_modules/miniprogram-api-typings/types/wx/lib.wx.api.d.ts",
  import.meta.url,
);

/**
 * Parse the method names of `interface Wx` from the installed typings.
 *
 * @returns The method names declared on `Wx`.
 */
const readWxMethods = (): string[] => {
  const source = readFileSync(TYPINGS_PATH, "utf8")
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/\/\/[^\n]*/gu, "");
  const marker = "    interface Wx {";
  const start = source.indexOf(marker);

  if (start === -1) throw new Error("interface Wx not found in miniprogram-api-typings");

  let depth = 0;
  let end = start;

  for (let index = start; index < source.length; index += 1) {
    if (source[index] === "{") {
      depth += 1;
    } else if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        end = index;
        break;
      }
    }
  }

  const body = source.slice(start, end);
  const methods = new Set<string>();

  for (const match of body.matchAll(/^\s{8}([A-Za-z_$][\w$]*)\s*[<(]/gmu))
    if (match[1]) methods.add(match[1]);

  return [...methods];
};

describe("api coverage guard", () => {
  const methods = readWxMethods();
  const methodSet = new Set(methods);
  const wxKeys = Object.keys(wx);

  it("should parse the typings interface", () => {
    expect(methods.length).toBeGreaterThan(450);
    expect(methodSet.has("navigateTo")).toBe(true);
    expect(methodSet.has("request")).toBe(true);
  });

  it("should keep the unsupported allowlist split at A4 97 + deferred 24", () => {
    expect(A4_UNSUPPORTED_APIS).toHaveLength(97);
    expect(DEFERRED_APIS).toHaveLength(24);
    expect(UNSUPPORTED_APIS).toHaveLength(121);
    expect(new Set(UNSUPPORTED_APIS).size).toBe(UNSUPPORTED_APIS.length);
  });

  it("should have exactly the unsupported APIs missing", () => {
    const missing = methods.filter((name) => !(name in wx)).sort();

    expect(missing).toStrictEqual([...UNSUPPORTED_APIS].sort());
  });

  it("should have exactly the declared mock-only APIs", () => {
    const mockOnly = wxKeys.filter((name) => !methodSet.has(name)).sort();

    expect(mockOnly).toStrictEqual([...MOCK_ONLY_APIS].sort());
  });

  it("should report unsupported APIs as unavailable through canIUse", () => {
    for (const name of UNSUPPORTED_APIS) expect(wx.canIUse(name)).toBe(false);
  });

  it("should report implemented APIs as available through canIUse", () => {
    for (const name of ["request", "navigateTo", "createAnimation", "chooseAddress", "playVoice"])
      expect(wx.canIUse(name)).toBe(true);
  });
});
