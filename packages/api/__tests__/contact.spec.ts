import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { addContact } from "../src/index.js";

describe(addContact, () => {
  it("should resolve when authorized", async () => {
    await expect(addContact({ firstName: "test" })).resolves.toBeUndefined();
  });
});
