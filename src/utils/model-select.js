export function defaultModelSlug(models) {
  const list = Array.isArray(models) ? models : [];
  const first = list.find((model) => typeof model?.slug === "string" && model.slug.length > 0);
  return first ? first.slug : "";
}

export function resolveModelSlug({ currentSlug, models }) {
  if (typeof currentSlug === "string" && currentSlug.length > 0) return currentSlug;
  return defaultModelSlug(models);
}

export function modelSelectorState({ loading, error, models }) {
  if (loading) return "loading";
  if (error) return "error";
  if (!Array.isArray(models) || models.length === 0) return "empty";
  return "ready";
}

export function canStartSession({ sessionId, modelSlug }) {
  if (sessionId) return true;
  return typeof modelSlug === "string" && modelSlug.length > 0;
}
