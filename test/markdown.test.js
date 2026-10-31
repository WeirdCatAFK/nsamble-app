import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderMarkdown } from "../src/utils/markdown.js";

describe("renderMarkdown", () => {
  it("renders markdown formatting", () => {
    const { __html } = renderMarkdown("**bold** and `code`");
    assert.ok(__html.includes("<strong>bold</strong>"));
    assert.ok(__html.includes("<code>code</code>"));
  });

  it("keeps safe links and drops javascript URLs", () => {
    const safe = renderMarkdown("[docs](https://example.com)").__html;
    assert.ok(safe.includes('href="https://example.com"'));
    for (const source of ["[x](javascript:alert(1))", "[x](JaVaScRiPt:alert(1))", "[x](  javascript:alert(1)  )"]) {
      const evil = renderMarkdown(source).__html;
      assert.ok(!evil.toLowerCase().includes("javascript:"), source);
    }
    const img = renderMarkdown("![x](javascript:alert(1))").__html;
    assert.ok(!img.includes("<img"));
  });

  it("escapes raw HTML instead of injecting it", () => {
    const script = renderMarkdown("<script>alert(1)</script>").__html;
    assert.ok(!script.includes("<script"));
    assert.ok(script.includes("&lt;script"));

    const img = renderMarkdown('<img src=x onerror="alert(1)">').__html;
    assert.ok(!img.includes("<img"));
    assert.ok(img.includes("&lt;img"));
  });

  it("handles empty input", () => {
    assert.equal(renderMarkdown("").__html, "");
    assert.equal(renderMarkdown(null).__html, "");
    assert.equal(renderMarkdown(undefined).__html, "");
  });
});
