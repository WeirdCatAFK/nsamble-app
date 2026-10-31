import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TEXTAREA_MAX_HEIGHT, nextTextareaStyle } from "../src/utils/textarea.js";

describe("nextTextareaStyle", () => {
  it("grows the textarea with its content", () => {
    assert.deepEqual(nextTextareaStyle(80), { height: "80px", overflowY: "hidden" });
  });

  it("caps growth at the max height and scrolls beyond it", () => {
    assert.deepEqual(nextTextareaStyle(TEXTAREA_MAX_HEIGHT + 40), {
      height: `${TEXTAREA_MAX_HEIGHT}px`,
      overflowY: "auto",
    });
  });

  it("respects a custom max height", () => {
    assert.deepEqual(nextTextareaStyle(300, 200), { height: "200px", overflowY: "auto" });
    assert.deepEqual(nextTextareaStyle(120, 200), { height: "120px", overflowY: "hidden" });
  });
});
