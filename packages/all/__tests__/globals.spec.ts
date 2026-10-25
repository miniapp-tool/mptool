import { describe, expect, it } from "vitest";

// oxlint-disable-next-line import/no-namespace -- assert the complete aggregated export surface
import * as api from "../../api/src/index.js";
// oxlint-disable-next-line import/no-namespace -- assert the complete aggregated export surface
import * as file from "../../file/src/index.js";
// oxlint-disable-next-line import/no-namespace -- assert the complete aggregated export surface
import * as net from "../../net/src/index.js";
// oxlint-disable-next-line import/no-namespace -- assert the complete aggregated export surface
import * as parser from "../../parser/src/index.js";
import { mptoolGlobals } from "../src/global.js";

const names = [
  ...Object.keys(api),
  ...Object.keys(file),
  ...Object.keys(net),
  ...Object.keys(parser),
].filter((name) => name !== "default");

describe("mptool globals aggregation", () => {
  it("should not let aggregated packages overwrite each other", () => {
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);

    expect([...new Set(duplicates)]).toStrictEqual([]);
  });

  it("should expose every export of the aggregated packages", () => {
    const expectedNames = new Set([
      ...Object.keys(api),
      ...Object.keys(file),
      ...Object.keys(net),
      ...Object.keys(parser),
    ]);

    expect(Object.keys(mptoolGlobals).sort()).toStrictEqual([...expectedNames].sort());
  });

  it("should expose the most commonly used hot-reload helpers", () => {
    expect(mptoolGlobals).toHaveProperty("request");
    expect(mptoolGlobals).toHaveProperty("readFile");
    expect(mptoolGlobals).toHaveProperty("parseHTML");
    expect(mptoolGlobals).toHaveProperty("writeClipboard");
  });
});
