import { modelSelectorState } from "../utils/model-select.js";
import "./ModelSelector.css";

export default function ModelSelector({
  models,
  modelSlug,
  onChange,
  disabled,
  loading,
  error,
  onRetry,
  locked,
}) {
  if (locked) {
    return (
      <span className="model-select-locked" title="Model is fixed for this conversation">
        {modelSlug || "Default model"}
      </span>
    );
  }

  const state = modelSelectorState({ loading, error, models });

  if (state === "loading") {
    return (
      <select className="chat-model-select" disabled value="" aria-label="Loading models">
        <option value="">Loading models…</option>
      </select>
    );
  }

  if (state === "error") {
    return (
      <span className="model-select-error">
        Models unavailable
        <button
          type="button"
          className="model-select-retry"
          onClick={onRetry}
          disabled={disabled}
        >
          Retry
        </button>
      </span>
    );
  }

  if (state === "empty") {
    return <span className="model-select-empty">No models available</span>;
  }

  return (
    <select
      className="chat-model-select"
      value={modelSlug}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-label="Select model"
    >
      {modelSlug === "" && <option value="">Select a model</option>}
      {models.map((m) => (
        <option key={m.slug} value={m.slug}>{m.slug}</option>
      ))}
    </select>
  );
}
