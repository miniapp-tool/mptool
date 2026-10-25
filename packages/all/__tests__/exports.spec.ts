// oxlint-disable-next-line import/no-namespace -- assert the complete re-export surface
import * as all from "@mptool/all";
// oxlint-disable-next-line import/no-namespace -- assert the complete re-export surface
import * as api from "@mptool/api";
// oxlint-disable-next-line import/no-namespace -- assert the complete re-export surface
import * as enhance from "@mptool/enhance";
// oxlint-disable-next-line import/no-namespace -- assert the complete re-export surface
import * as file from "@mptool/file";
import { mockWx } from "@mptool/mock";
// oxlint-disable-next-line import/no-namespace -- assert the complete re-export surface
import * as net from "@mptool/net";
// oxlint-disable-next-line import/no-namespace -- assert the complete re-export surface
import * as parser from "@mptool/parser";
// oxlint-disable-next-line import/no-namespace -- assert the complete re-export surface
import * as shared from "@mptool/shared";
import { describe, expect, it } from "vitest";

const bundledModules = [api, enhance, file, net, parser];

describe("@mptool/all export surface", () => {
  it("re-exports every public value of the bundled packages", () => {
    // Derive the expected names from the packages themselves, so the check follows their public API
    // instead of a hard-coded list that silently rots.
    const expectedNames = new Set(bundledModules.flatMap((module) => Object.keys(module)));

    expect([...expectedNames].filter((name) => !(name in all))).toStrictEqual([]);
  });

  it("re-exports the shared values that enhance does not already provide", () => {
    // `Emitter` is intentionally excluded: `@mptool/enhance` already re-exports it, so a second
    // re-export would trigger TS2308.
    const expectedNames = Object.keys(shared).filter((name) => name !== "Emitter");

    expect(expectedNames.filter((name) => !(name in all))).toStrictEqual([]);
  });

  it("exposes the framework, net, file and parser entry points", () => {
    const entryPoints: Record<string, unknown> = {
      $App: all.$App,
      $Component: all.$Component,
      $Config: all.$Config,
      $Page: all.$Page,
      Headers: all.Headers,
      URLSearchParams: all.URLSearchParams,
      convertSVGToDataURI: all.convertSVGToDataURI,
      createRequest: all.createRequest,
      getRichTextNodes: all.getRichTextNodes,
      getText: all.getText,
      readFile: all.readFile,
      request: all.request,
      writeFile: all.writeFile,
    };

    expect(
      Object.entries(entryPoints)
        .filter(([, value]) => typeof value !== "function")
        .map(([name]) => name),
    ).toStrictEqual([]);
  });

  it("mounts the api / file / net / parser namespaces on mptoolGlobals", () => {
    const globals = all.mptoolGlobals;
    const expectedNames = [api, file, net, parser].flatMap((module) => Object.keys(module));

    expect(expectedNames.filter((name) => !(name in globals))).toStrictEqual([]);
  });

  it("installs a non-enumerable global namespace", () => {
    all.installMptoolGlobals();

    try {
      expect((globalThis as unknown as Record<string, unknown>).mptool).toBe(all.mptoolGlobals);
      expect(Object.propertyIsEnumerable.call(globalThis, "mptool")).toBe(false);
    } finally {
      Reflect.deleteProperty(globalThis, "mptool");
    }
  });

  it("exports the MpError class used by request failures", async () => {
    expect(new all.MpError({ code: 1, message: "boom" })).toBeInstanceOf(Error);

    mockWx.failNext("request", { type: "network" });

    try {
      const failure = await all.request("https://example.com/api").catch((err: unknown) => err);

      // The bundle must expose the exact class `request` rejects with, otherwise callers cannot use
      // `instanceof MpError` for the documented error contract.
      expect(failure).toBeInstanceOf(all.MpError);
    } finally {
      mockWx.reset();
    }
  });
});
