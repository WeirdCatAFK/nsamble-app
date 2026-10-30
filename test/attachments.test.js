import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { toAttachmentRefs } from "../src/api/client.js";

describe("toAttachmentRefs", () => {
  it("maps wrapped upload results to attachment refs", () => {
    const refs = toAttachmentRefs([
      { file: { id: "abc", name: "a.png" } },
      { file: { id: "def", name: "b.png" } },
    ]);

    assert.deepEqual(refs, [{ fileId: "abc" }, { fileId: "def" }]);
  });

  it("maps flat upload results to attachment refs", () => {
    const refs = toAttachmentRefs([{ id: "abc" }]);

    assert.deepEqual(refs, [{ fileId: "abc" }]);
  });

  it("throws when an upload result has no file id", () => {
    assert.throws(() => toAttachmentRefs([{}]), /file id/);
    assert.throws(() => toAttachmentRefs([{ file: {} }]), /file id/);
  });
});
