import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MACHINE_TYPES, machineIconKey } from "../src/utils/machines.js";

describe("MACHINE_TYPES", () => {
  it("offers the common machine presets", () => {
    const ids = MACHINE_TYPES.map((t) => t.id);
    assert.deepEqual(ids, ["3d-printer", "laser-cutter", "cnc-mill", "vinyl-cutter", "other"]);
    for (const type of MACHINE_TYPES) {
      assert.equal(typeof type.label, "string");
    }
  });
});

describe("machineIconKey", () => {
  it("matches preset labels to icon keys", () => {
    assert.equal(machineIconKey("3D printer"), "3d-printer");
    assert.equal(machineIconKey("Laser cutter"), "laser-cutter");
    assert.equal(machineIconKey("CNC mill"), "cnc-mill");
    assert.equal(machineIconKey("Vinyl cutter"), "vinyl-cutter");
  });

  it("matches common aliases", () => {
    assert.equal(machineIconKey("FDM printer"), "3d-printer");
    assert.equal(machineIconKey("resin printer"), "3d-printer");
    assert.equal(machineIconKey("CNC router"), "cnc-mill");
    assert.equal(machineIconKey("laser engraver"), "laser-cutter");
  });

  it("falls back to the generic icon", () => {
    assert.equal(machineIconKey(" pottery kiln "), "other");
    assert.equal(machineIconKey(""), "other");
    assert.equal(machineIconKey(null), "other");
    assert.equal(machineIconKey(undefined), "other");
  });
});
