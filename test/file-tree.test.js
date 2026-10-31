import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ext,
  splitPath,
  buildTree,
  stemOf,
  groupByStem,
  formatSize,
  formatTime,
} from "../src/utils/file-tree.js";

describe("ext", () => {
  it("reads the lowercase extension", () => {
    assert.equal(ext("bracket.STL"), "stl");
    assert.equal(ext("a/b.kicad_sch"), "kicad_sch");
    assert.equal(ext("README"), "");
    assert.equal(ext(undefined), "");
  });
});

describe("splitPath", () => {
  it("splits folders from the base name", () => {
    assert.deepEqual(splitPath("cad/bracket.stl"), { folders: ["cad"], base: "bracket.stl" });
    assert.deepEqual(splitPath("bracket.stl"), { folders: [], base: "bracket.stl" });
    assert.deepEqual(splitPath(""), { folders: [], base: "" });
  });
});

describe("stemOf", () => {
  it("strips directories and the extension", () => {
    assert.equal(stemOf("bracket.stl"), "bracket");
    assert.equal(stemOf("cad/bracket.scad"), "bracket");
    assert.equal(stemOf("README"), "README");
  });

  it("strips render view suffixes from PNGs only", () => {
    assert.equal(stemOf("bracket_front.png"), "bracket");
    assert.equal(stemOf("bracket_ISOMETRIC.PNG"), "bracket");
    assert.equal(stemOf("bracket_right.png"), "bracket");
    assert.equal(stemOf("bracket_top.png"), "bracket");
    assert.equal(stemOf("my_isometric_thing.stl"), "my_isometric_thing");
    assert.equal(stemOf("front.png"), "front");
  });
});

describe("groupByStem", () => {
  it("keeps one iteration outputs together across versions", () => {
    const files = [
      { id: "1", name: "bracket_v2.stl" },
      { id: "2", name: "bracket_v2_isometric.png" },
      { id: "3", name: "bracket.stl" },
      { id: "4", name: "bracket_isometric.png" },
    ];
    const groups = groupByStem(files);
    assert.deepEqual(groups.map((group) => group.stem), ["bracket_v2", "bracket"]);
    assert.deepEqual(groups[0].files.map((file) => file.id), ["1", "2"]);
    assert.deepEqual(groups[1].files.map((file) => file.id), ["3", "4"]);
  });

  it("ignores case drift between a mesh and its renders", () => {
    const groups = groupByStem([
      { id: "1", name: "Bracket.stl" },
      { id: "2", name: "bracket_front.png" },
    ]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].stem, "Bracket");
  });
});

describe("buildTree", () => {
  it("nests folders and sorts files by base name", () => {
    const tree = buildTree([
      { id: "1", name: "b.stl" },
      { id: "2", name: "cad/a.stl" },
      { id: "3", name: "a.stl" },
    ]);
    assert.deepEqual(tree.files.map((file) => file.id), ["3", "1"]);
    assert.ok(tree.folders.has("cad"));
    assert.deepEqual(tree.folders.get("cad").files.map((file) => file.base), ["a.stl"]);
  });
});

describe("formatSize", () => {
  it("formats bytes compactly", () => {
    assert.equal(formatSize(0), "");
    assert.equal(formatSize(512), "512 B");
    assert.equal(formatSize(2048), "2.0 KB");
    assert.equal(formatSize(3 * 1024 * 1024), "3.0 MB");
  });
});

describe("formatTime", () => {
  const now = Date.parse("2026-10-31T12:00:00Z");

  it("describes recent files relatively", () => {
    assert.equal(formatTime("2026-10-31T11:59:30Z", now), "just now");
    assert.equal(formatTime("2026-10-31T11:30:00Z", now), "30m ago");
    assert.equal(formatTime("2026-10-31T09:00:00Z", now), "3h ago");
    assert.equal(formatTime("2026-10-28T12:00:00Z", now), "3d ago");
  });

  it("dates older files and blanks bad input", () => {
    assert.equal(formatTime("2026-09-01T00:00:00Z", now), "2026-09-01");
    assert.equal(formatTime(undefined, now), "");
    assert.equal(formatTime("not-a-date", now), "");
  });
});
