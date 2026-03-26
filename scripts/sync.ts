import { readdirSync } from "node:fs";
import { get } from "node:https";
import { resolve as pathResolve } from "node:path";

const packagesDir = pathResolve(process.cwd(), "packages");
const packages = readdirSync(packagesDir);

interface PackageJson {
  name: string;
}

export const sync = (): Promise<void[]> => {
  const promises = packages.map((packageName) =>
    import(`../../packages/${packageName}/package.json`, {
      with: { type: "json" },
    }).then(
      ({ default: content }: { default: PackageJson }) =>
        new Promise<void>((resolve) => {
          get(`https://npmmirror.com/sync/${content.name}`).on("finish", () => {
            resolve();
          });
        }),
    ),
  );

  return Promise.all(promises);
};
