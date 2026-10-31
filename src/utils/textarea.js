export const TEXTAREA_MAX_HEIGHT = 160;

export function nextTextareaStyle(scrollHeight, maxHeight = TEXTAREA_MAX_HEIGHT) {
  const capped = Math.min(Math.max(scrollHeight, 0), maxHeight);
  return {
    height: `${capped}px`,
    overflowY: scrollHeight > maxHeight ? "auto" : "hidden",
  };
}

export function applyTextareaGrowth(element, maxHeight = TEXTAREA_MAX_HEIGHT) {
  if (!element) return;
  element.style.height = "auto";
  const style = nextTextareaStyle(element.scrollHeight, maxHeight);
  element.style.height = style.height;
  element.style.overflowY = style.overflowY;
}
