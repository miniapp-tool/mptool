import { describe, expect, it } from "vitest";

import { getRichTextNodes, getText, parseHTML } from "../src/index.js";

describe("input limits", () => {
  it("should enforce maxInputLength", async () => {
    await expect(getRichTextNodes("<p>x</p>", { maxInputLength: 4 })).rejects.toThrow(
      /Input length/u,
    );
    expect(() => getText("<p>x</p>", { maxInputLength: 4 })).toThrow(/Input length/u);
    await expect(getRichTextNodes("<p>x</p>", { maxInputLength: 100 })).resolves.toHaveLength(1);
    expect(getText("<p>x</p>", { maxInputLength: 100 })).toBe("x");
  });

  it("should enforce maxDepth on deeply nested input", async () => {
    const deep = `${"<div>".repeat(200)}x${"</div>".repeat(200)}`;

    await expect(getRichTextNodes(deep, { maxDepth: 10 })).rejects.toThrow(/nesting is too deep/u);
    expect(() => getText(deep, { maxDepth: 10 })).toThrow(/nesting is too deep/u);
  });

  it("should enforce maxDepth inside nested svg elements", async () => {
    const deepSvg = `<svg viewBox="0 0 10 10">${"<g>".repeat(200)}${"</g>".repeat(200)}</svg>`;

    await expect(getRichTextNodes(deepSvg, { maxDepth: 10 })).rejects.toThrow(
      /nesting is too deep/u,
    );

    // A depth within the limit (including the default, unlimited one) still converts normally.
    await expect(getRichTextNodes(deepSvg)).resolves.toHaveLength(1);
  });

  it("should not overflow the host stack when removing deep scripts", () => {
    const deep = `${"<div>".repeat(3000)}<script>x</script>${"</div>".repeat(3000)}`;

    // removeScript uses an explicit stack, so deep documents do not overflow the host stack
    // removeScript 使用显式栈，深文档不会撑爆宿主调用栈
    expect(() => parseHTML(deep)).not.toThrow();
  });

  it("should keep the default limits opt-in", async () => {
    await expect(getRichTextNodes("<div><p>a</p></div>")).resolves.toHaveLength(1);
    expect(getText("<div><p>a</p></div>")).toBe("a");
  });
});
