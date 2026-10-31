import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DOUBLE_TAP_SCALE,
  MAX_SCALE,
  MIN_SCALE,
  clampPan,
  clampScale,
  doubleTapTarget,
  panBy,
  panLimits,
  pinchDistance,
  pinchMidpoint,
  zoomAt,
} from "../src/utils/image-view.js";

describe("clampScale", () => {
  it("clamps into range and rejects non-finite input", () => {
    assert.equal(clampScale(2), 2);
    assert.equal(clampScale(0.5), MIN_SCALE);
    assert.equal(clampScale(99), MAX_SCALE);
    assert.equal(clampScale(Number.NaN), MIN_SCALE);
    assert.equal(clampScale(Infinity), MIN_SCALE);
  });
});

describe("panLimits", () => {
  it("is zero at scale 1 so the image stays centered", () => {
    assert.deepEqual(panLimits(200, 100, 1), { x: 0, y: 0 });
  });

  it("grows with scale so every corner stays reachable", () => {
    assert.deepEqual(panLimits(200, 100, 2), { x: 100, y: 50 });
    assert.deepEqual(panLimits(200, 100, 3), { x: 200, y: 100 });
  });
});

describe("clampPan", () => {
  it("clamps offsets to the limits", () => {
    assert.deepEqual(clampPan(999, -999, 200, 100, 2), { x: 100, y: -50 });
    assert.deepEqual(clampPan(10, 20, 200, 100, 2), { x: 10, y: 20 });
  });
});

describe("zoomAt", () => {
  it("keeps the content point under the focal point stable", () => {
    const view = { scale: 1, x: 0, y: 0 };
    const focal = { x: 50, y: 20 };
    const next = zoomAt(view, focal.x, focal.y, 2, 400, 400);
    assert.equal(next.scale, 2);
    // content under focal before: (f - t) / s; must map back to f after.
    const contentX = (focal.x - view.x) / view.scale;
    const contentY = (focal.y - view.y) / view.scale;
    assert.equal(contentX * next.scale + next.x, focal.x);
    assert.equal(contentY * next.scale + next.y, focal.y);
  });

  it("resets pan when zooming back out to scale 1", () => {
    const next = zoomAt({ scale: 3, x: 40, y: -30 }, 0, 0, 1, 400, 400);
    assert.deepEqual(next, { scale: 1, x: 0, y: 0 });
  });

  it("clamps scale and pan into bounds", () => {
    const next = zoomAt({ scale: 1, x: 0, y: 0 }, 500, 500, 99, 200, 200);
    assert.equal(next.scale, MAX_SCALE);
    const limits = panLimits(200, 200, MAX_SCALE);
    assert.ok(Math.abs(next.x) <= limits.x);
    assert.ok(Math.abs(next.y) <= limits.y);
  });
});

describe("panBy", () => {
  it("does nothing at scale 1", () => {
    const view = { scale: 1, x: 0, y: 0 };
    assert.equal(panBy(view, 30, 30, 200, 200), view);
  });

  it("moves and clamps when zoomed", () => {
    const next = panBy({ scale: 2, x: 0, y: 0 }, 30, -500, 200, 100);
    assert.deepEqual(next, { scale: 2, x: 30, y: -50 });
  });
});

describe("doubleTapTarget", () => {
  it("toggles between fit and the double-tap scale", () => {
    assert.equal(doubleTapTarget(1), DOUBLE_TAP_SCALE);
    assert.equal(doubleTapTarget(DOUBLE_TAP_SCALE), MIN_SCALE);
    assert.equal(doubleTapTarget(5), MIN_SCALE);
  });
});

describe("pinch helpers", () => {
  it("measures distance and midpoint", () => {
    assert.equal(pinchDistance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
    assert.deepEqual(pinchMidpoint({ x: 0, y: 0 }, { x: 10, y: 20 }), { x: 5, y: 10 });
  });
});
