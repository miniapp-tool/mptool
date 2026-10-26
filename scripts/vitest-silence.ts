import { afterAll, vi } from "vitest";

/**
 * Tests intentionally exercise failure paths (missing files, denied permissions, failed downloads),
 * and the logger writes those expected errors to `console`. Silence the console in test workers so
 * the reporter only shows real failures; set `VITEST_VERBOSE=1` to keep the original output.
 *
 * 测试会刻意走失败路径，logger 会把预期错误写到 console；这里默认静音，避免刷屏。 需要看原始输出时设置 `VITEST_VERBOSE=1`。
 */
const verbose = process.env.VITEST_VERBOSE === "1" || process.env.VITEST_VERBOSE === "true";

if (!verbose) {
  for (const method of ["debug", "info", "log", "warn", "error"] as const)
    vi.spyOn(console, method).mockImplementation(() => void 0);
}

afterAll(() => {
  vi.restoreAllMocks();
});
