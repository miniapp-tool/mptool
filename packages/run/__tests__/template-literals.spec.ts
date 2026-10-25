import { describe, it } from "vitest";

import { runBoth } from "./golden.js";

describe("template literal line endings", () => {
  it("should normalize CRLF and lone CR to LF in cooked values", () => {
    runBoth("`a\r\nb`.length");
    runBoth("`a\rb`.length");
    runBoth("`a\r\nb`");
    runBoth("`a\rb`");
  });

  it("should normalize literal line terminators but not escaped CR", () => {
    runBoth("`a\r\nb`.charCodeAt(1)");
    runBoth("`a\\rb`.charCodeAt(1)");
  });
});
