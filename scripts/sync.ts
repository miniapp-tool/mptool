import { readdirSync, readFileSync } from "node:fs";
import { request } from "node:https";
import path from "node:path";

const packagesDir = path.resolve(process.cwd(), "packages");
const packages = readdirSync(packagesDir);

/** How many times a failed sync is retried / 同步失败后的重试次数 */
const RETRY_TIMES = 3;
/** Base delay between retries, multiplied by the attempt number / 重试基础间隔，按次数递增 */
const RETRY_DELAY = 1000;
/** Per-request timeout in milliseconds / 单次请求超时（毫秒） */
const REQUEST_TIMEOUT = 15_000;

/**
 * Wait for the given duration.
 *
 * @param ms - Milliseconds / 毫秒
 * @returns Resolves after the delay / 延迟后 resolve
 */
const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Trigger the npmmirror sync endpoint for one package once.
 *
 * The request only succeeds on a 2xx response; timeouts, network errors and non-2xx responses all
 * reject, so the release job can see the failure instead of staying green.
 *
 * 触发一次 npm 包到 npmmirror 的同步：只有 2xx 才算成功，超时、网络错误与非 2xx 响应都会 reject， 让发布流程能感知失败而不是继续显示绿色。
 *
 * @param packageName - Package name / 包名
 * @returns Resolves when the sync is accepted / 同步请求被接受时 resolve
 */
const triggerSync = (packageName: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const req = request(
      `https://registry-direct.npmmirror.com/-/package/${packageName}/syncs`,
      {
        method: "PUT",
        headers: {
          "Content-Length": 0,
        },
      },
      (res) => {
        const { statusCode = 0 } = res;

        // Drain the body so the socket can be reused / released
        res.resume();
        res.on("end", () => {
          if (statusCode >= 200 && statusCode < 300) resolve();
          else
            reject(new Error(`npmmirror sync of ${packageName} failed with status ${statusCode}`));
        });
      },
    );

    req.setTimeout(REQUEST_TIMEOUT, () => {
      req.destroy(
        new Error(`npmmirror sync of ${packageName} timed out after ${REQUEST_TIMEOUT}ms`),
      );
    });

    req.on("error", reject);
    req.end();
  });

/**
 * Sync one package, retrying transient failures.
 *
 * @param packageName - Package name / 包名
 * @param attempt - Current attempt, starting at 1 / 当前尝试次数，从 1 开始
 */
const syncPackage = async (packageName: string, attempt = 1): Promise<void> => {
  try {
    await triggerSync(packageName);
    console.log(`Synced ${packageName} to npmmirror`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (attempt >= RETRY_TIMES) throw new Error(message, { cause: err });

    console.warn(
      `::warning::npmmirror sync of ${packageName} failed (attempt ${attempt}/${RETRY_TIMES}), retrying: ${message}`,
    );
    await wait(RETRY_DELAY * attempt);
    await syncPackage(packageName, attempt + 1);
  }
};

export const sync = async (): Promise<void> => {
  const packageNames = packages.map((packageName) => {
    const content = readFileSync(path.resolve(packagesDir, packageName, "package.json"), "utf8");
    const packageJson = JSON.parse(content) as { name: string };

    return packageJson.name;
  });

  const results = await Promise.allSettled(packageNames.map((name) => syncPackage(name)));
  const failures = results.filter(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );

  if (failures.length > 0) {
    for (const failure of failures) {
      const reason = failure.reason as unknown;

      console.error(`::error::${reason instanceof Error ? reason.message : String(reason)}`);
    }

    throw new Error(`${failures.length} package(s) failed to sync to npmmirror`);
  }
};

await sync();
