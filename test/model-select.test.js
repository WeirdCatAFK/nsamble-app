import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canStartSession,
  defaultModelSlug,
  modelSelectorState,
  resolveModelSlug,
} from "../src/utils/model-select.js";

const MODELS = [
  { slug: "model-a", provider: "test" },
  { slug: "model-b", provider: "test" },
];

describe("defaultModelSlug", () => {
  it("returns the first valid slug", () => {
    assert.equal(defaultModelSlug(MODELS), "model-a");
  });

  it("returns empty string when no usable model exists", () => {
    assert.equal(defaultModelSlug([]), "");
    assert.equal(defaultModelSlug(undefined), "");
    assert.equal(defaultModelSlug([{ slug: "" }, {}]), "");
  });
});

describe("resolveModelSlug", () => {
  it("keeps an explicit selection", () => {
    assert.equal(
      resolveModelSlug({ currentSlug: "model-b", models: MODELS }),
      "model-b",
    );
  });

  it("keeps the session model even when it is absent from the list", () => {
    assert.equal(
      resolveModelSlug({ currentSlug: "legacy-model", models: MODELS }),
      "legacy-model",
    );
  });

  it("falls back to the first model when nothing is selected", () => {
    assert.equal(resolveModelSlug({ currentSlug: "", models: MODELS }), "model-a");
    assert.equal(resolveModelSlug({ currentSlug: undefined, models: MODELS }), "model-a");
  });

  it("returns empty string when nothing is selected and no model exists", () => {
    assert.equal(resolveModelSlug({ currentSlug: "", models: [] }), "");
  });
});

describe("modelSelectorState", () => {
  it("reports loading while models fetch", () => {
    assert.equal(
      modelSelectorState({ loading: true, error: null, models: [] }),
      "loading",
    );
  });

  it("reports error when the fetch failed", () => {
    assert.equal(
      modelSelectorState({ loading: false, error: new Error("down"), models: [] }),
      "error",
    );
  });

  it("reports empty when the fetch succeeded with no models", () => {
    assert.equal(
      modelSelectorState({ loading: false, error: null, models: [] }),
      "empty",
    );
  });

  it("reports ready when models are available", () => {
    assert.equal(
      modelSelectorState({ loading: false, error: null, models: MODELS }),
      "ready",
    );
  });
});

describe("canStartSession", () => {
  it("allows sending when a session already exists", () => {
    assert.equal(canStartSession({ sessionId: "s1", modelSlug: "" }), true);
  });

  it("allows sending when a model is selected", () => {
    assert.equal(canStartSession({ sessionId: null, modelSlug: "model-a" }), true);
  });

  it("blocks sending without a session or a selected model", () => {
    assert.equal(canStartSession({ sessionId: null, modelSlug: "" }), false);
    assert.equal(canStartSession({ sessionId: null, modelSlug: undefined }), false);
  });
});
