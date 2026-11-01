import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const homepage = await readFile(resolve(here, "../src/components/Homepage.jsx"), "utf8");
const css = await readFile(resolve(here, "../src/components/Homepage.css"), "utf8");

describe("homepage scrolling", () => {
  it("bounds the homepage to the viewport so it can scroll", () => {
    assert.match(css, /\.homepage\s*\{[^}]*height:\s*100dvh/, "homepage must be a bounded scroll container");
    assert.match(css, /\.homepage\s*\{[^}]*overflow-y:\s*auto/, "homepage must scroll vertically");
  });

  it("lets touch users scroll past the 3D hero", () => {
    assert.match(css, /\.hero-stage canvas\s*\{[^}]*touch-action:\s*pan-y/, "canvas must allow vertical touch scrolling");
  });
});

describe("homepage wayfinding after login", () => {
  it("anchors the start menu and projects section", () => {
    assert.ok(homepage.includes('id="start"'), "start menu needs an anchor id");
    assert.ok(homepage.includes('id="projects"'), "projects section needs an anchor id");
    assert.ok(homepage.includes('href="#projects"'), "nav must link to projects");
  });

  it("guides a signed-in user with no projects yet", () => {
    assert.ok(homepage.includes("No projects yet"), "empty projects state must explain the next step");
  });

  it("scrolls to the start menu right after signing in", () => {
    assert.ok(homepage.includes("pendingGuideRef"), "login must mark that guidance scroll is pending");
    assert.ok(homepage.includes('getElementById("start")'), "guidance must scroll to the start menu");
  });
});
