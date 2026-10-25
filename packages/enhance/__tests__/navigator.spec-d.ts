import "@mptool/mock";
import { describe, expectTypeOf, it } from "vitest";

import { $Page } from "../src/index.js";

describe("navigator types", () => {
  it("should type navigation results as possibly undefined while the lock is held", () => {
    $Page("example", {
      f() {
        // The navigation lock is held: the trigger is ignored and resolves `undefined`
        expectTypeOf(this.$go("main")).toEqualTypeOf<
          Promise<WechatMiniprogram.NavigateToSuccessCallbackResult | undefined>
        >();
        expectTypeOf(this.$switch("main")).toEqualTypeOf<
          Promise<WechatMiniprogram.GeneralCallbackResult | undefined>
        >();
      },
    });
  });
});
