// oxlint-disable-next-line import/no-namespace -- assert the complete re-export surface
import * as bundle from "@mptool/all";
import { describe, expect, it } from "vitest";

// oxlint-disable-next-line import/no-namespace -- assert the complete re-export surface
import * as api from "../../api/src/index.js";
// oxlint-disable-next-line import/no-namespace -- assert the complete re-export surface
import * as file from "../../file/src/index.js";
// oxlint-disable-next-line import/no-namespace -- assert the complete re-export surface
import * as net from "../../net/src/index.js";
// oxlint-disable-next-line import/no-namespace -- assert the complete re-export surface
import * as parser from "../../parser/src/index.js";
// The other specs import `@mptool/all`, which resolves through the package `exports` field to
// `dist/index.js`. Import the source entry directly so the re-export file that produces the
// published bundle is exercised as well.
// oxlint-disable-next-line import/no-namespace -- assert the complete re-export surface
import * as source from "../src/index.js";

// Captured before any test blanks `globalThis`, because the `globalThis` binding itself resolves
// through this object.
const hostGlobal = globalThis;

// The `typeof globalThis !== "undefined"` guard in `src/global.ts` has a fallback branch that a
// Node test can otherwise never reach, so blank the host property for the duration of the call and
// restore it from the captured descriptor afterwards.
const blankGlobalThis = (): PropertyDescriptor | undefined => {
  const descriptor = Object.getOwnPropertyDescriptor(hostGlobal, "globalThis");

  Object.defineProperty(hostGlobal, "globalThis", {
    configurable: true,
    enumerable: false,
    value: undefined,
    writable: true,
  });

  return descriptor;
};

const restoreGlobalThis = (descriptor: PropertyDescriptor | undefined): void => {
  if (descriptor) Object.defineProperty(hostGlobal, "globalThis", descriptor);
  else Reflect.deleteProperty(hostGlobal, "globalThis");
};

describe("@mptool/all source entry", () => {
  it("re-exports exactly the same names as the built bundle", () => {
    // The published bundle is generated from this file, so a name that only exists on one side
    // means the build output and the source have drifted apart.
    expect(Object.keys(source).sort()).toStrictEqual(Object.keys(bundle).sort());
  });

  it("exposes the framework, net, file and parser entry points", () => {
    const entryPoints: Record<string, unknown> = {
      $App: source.$App,
      $Component: source.$Component,
      $Config: source.$Config,
      $Page: source.$Page,
      Headers: source.Headers,
      URLSearchParams: source.URLSearchParams,
      convertSVGToDataURI: source.convertSVGToDataURI,
      createRequest: source.createRequest,
      getRichTextNodes: source.getRichTextNodes,
      getText: source.getText,
      readFile: source.readFile,
      request: source.request,
      writeFile: source.writeFile,
    };

    expect(
      Object.entries(entryPoints)
        .filter(([, value]) => typeof value !== "function")
        .map(([name]) => name),
    ).toStrictEqual([]);
  });

  it("aggregates the api / file / net / parser exports into mptoolGlobals", () => {
    const expectedNames = new Set(
      [api, file, net, parser].flatMap((module) => Object.keys(module)),
    );

    expect(expectedNames.size).toBeGreaterThan(0);
    expect(Object.keys(source.mptoolGlobals).sort()).toStrictEqual([...expectedNames].sort());

    // The namespace must aggregate the very same source modules, not copies of them.
    expect(source.mptoolGlobals.writeClipboard).toBe(api.writeClipboard);
    expect(source.mptoolGlobals.readFile).toBe(file.readFile);
    expect(source.mptoolGlobals.request).toBe(net.request);
    expect(source.mptoolGlobals.parseHTML).toBe(parser.parseHTML);
  });

  it("installs a non-enumerable, re-installable global namespace", () => {
    source.installMptoolGlobals();

    try {
      const descriptor = Object.getOwnPropertyDescriptor(globalThis, "mptool");

      expect((globalThis as unknown as Record<string, unknown>).mptool).toBe(source.mptoolGlobals);
      expect(descriptor).toMatchObject({
        configurable: true,
        enumerable: false,
        value: source.mptoolGlobals,
        writable: true,
      });

      // Hosts call this once in `app.js`, but re-installing (e.g. after a hot reload of the host
      // bundle) must keep exposing the same namespace object.
      source.installMptoolGlobals();
      expect((globalThis as unknown as Record<string, unknown>).mptool).toBe(source.mptoolGlobals);
    } finally {
      Reflect.deleteProperty(globalThis, "mptool");
    }

    expect("mptool" in globalThis).toBe(false);
  });

  it("skips installation when the host has no global object", () => {
    Reflect.deleteProperty(globalThis, "mptool");

    let installed = false;
    const descriptor = blankGlobalThis();

    try {
      source.installMptoolGlobals();
      installed = "mptool" in hostGlobal;
    } finally {
      restoreGlobalThis(descriptor);
    }

    expect(installed).toBe(false);
    expect("mptool" in globalThis).toBe(false);
  });
});
