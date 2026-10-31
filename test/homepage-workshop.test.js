import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const homepage = await readFile(
  resolve(dirname(fileURLToPath(import.meta.url)), "../src/components/Homepage.jsx"),
  "utf8",
);

describe("homepage workshop placement", () => {
  it("renders the workshop board before the projects list", () => {
    const board = homepage.indexOf("{user && <WorkshopSection />}");
    assert.ok(board > -1, "workshop board is not rendered on the homepage");
    assert.ok(
      board < homepage.indexOf("Your projects"),
      "workshop board must come before the projects list",
    );
  });
});
