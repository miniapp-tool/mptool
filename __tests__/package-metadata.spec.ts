import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const rootDir = path.resolve(import.meta.dirname, "..");
const packagesDir = path.join(rootDir, "packages");

/** Only the conditional root export is typed; `./package.json` is a plain string export. */
interface PackageManifest {
  exports?: {
    "."?: {
      default?: string;
      types?: string;
    };
  };
  files?: string[];
  main?: string;
  miniprogram?: string;
  module?: string;
  name: string;
  publishConfig?: { access?: string };
  version: string;
}

const entries = readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => {
    const manifestPath = path.join(packagesDir, entry.name, "package.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as PackageManifest;

    return { directory: entry.name, manifest };
  });

const lernaConfig = JSON.parse(readFileSync(path.join(rootDir, "lerna.json"), "utf8")) as {
  version: string;
};

/** Flatten the parts every published package has to agree on. */
const actualMetadata = entries.map(({ manifest }) => ({
  name: manifest.name,
  version: manifest.version,
  main: manifest.main,
  module: manifest.module,
  miniprogram: manifest.miniprogram,
  files: manifest.files,
  access: manifest.publishConfig?.access,
  types: manifest.exports?.["."]?.types,
  default: manifest.exports?.["."]?.default,
}));

describe("published package metadata", () => {
  it("covers every package directory", () => {
    expect(entries).toHaveLength(12);
    expect(entries.map(({ directory }) => directory).sort()).toStrictEqual(
      readdirSync(packagesDir)
        .filter((name) => !name.startsWith("."))
        .sort(),
    );
  });

  it("keeps every package on the shared metadata contract", () => {
    const expectedMetadata = actualMetadata.map(({ name }) => ({
      name: `@mptool/${name.slice("@mptool/".length)}`,
      version: lernaConfig.version,
      main: "./dist/index.js",
      module: "./dist/index.js",
      miniprogram: "dist",
      files: ["dist"],
      access: "public",
      types: "./dist/index.d.ts",
      default: "./dist/index.js",
    }));

    expect(actualMetadata).toStrictEqual(expectedMetadata);
  });

  it("declares a name that matches the directory", () => {
    const directoryNames = entries.map(({ directory }) => ({
      directory,
      name: `@mptool/${directory}`,
    }));

    expect(
      entries.map(({ directory, manifest }) => ({ directory, name: manifest.name })),
    ).toStrictEqual(directoryNames);
  });
});
