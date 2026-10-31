import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isPreviewable, isTextFile, isImageFile, baseName } from "../src/utils/preview.js";

describe("isPreviewable", () => {
  it("accepts stl, text, and image files", () => {
    assert.equal(isPreviewable("part.stl"), true);
    assert.equal(isPreviewable("box.scad"), true);
    assert.equal(isPreviewable("spec.md"), true);
    assert.equal(isPreviewable("sheet.svg"), true);
    assert.equal(isPreviewable("photo.png"), true);
  });

  it("ignores case", () => {
    assert.equal(isPreviewable("PART.STL"), true);
    assert.equal(isPreviewable("Notes.MD"), true);
  });

  it("rejects unknown or missing extensions", () => {
    assert.equal(isPreviewable("archive.zip"), false);
    assert.equal(isPreviewable("README"), false);
    assert.equal(isPreviewable(""), false);
    assert.equal(isPreviewable(undefined), false);
  });
});

describe("isTextFile", () => {
  it("matches text extensions only", () => {
    assert.equal(isTextFile("a.scad"), true);
    assert.equal(isTextFile("a.json"), true);
    assert.equal(isTextFile("a.stl"), false);
    assert.equal(isTextFile("a.png"), false);
    assert.equal(isTextFile(undefined), false);
  });
});

describe("isImageFile", () => {
  it("matches image extensions only", () => {
    assert.equal(isImageFile("a.svg"), true);
    assert.equal(isImageFile("a.png"), true);
    assert.equal(isImageFile("a.stl"), false);
    assert.equal(isImageFile("a.md"), false);
    assert.equal(isImageFile(undefined), false);
  });
});

describe("baseName", () => {
  it("strips directories and keeps bare names", () => {
    assert.equal(baseName("a/b/c.stl"), "c.stl");
    assert.equal(baseName("c.stl"), "c.stl");
    assert.equal(baseName(""), "");
    assert.equal(baseName(undefined), "");
  });
});
