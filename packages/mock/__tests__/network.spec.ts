import { describe, expect, it } from "vitest";

import { wx } from "../src/index.js";

describe("request mock", () => {
  it("should resolve a successful response", async () => {
    const res = (await wx.request({ url: "https://example.com/api" })) as {
      statusCode: number;
      data: unknown;
      header: Record<string, string>;
      cookies: string[];
    };

    expect(res.statusCode).toBe(200);
    expect(res.data).toStrictEqual({});
    expect(res.header).toStrictEqual({});
    expect(res.cookies).toStrictEqual([]);
  });
});
