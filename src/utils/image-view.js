export const MIN_SCALE = 1;
export const MAX_SCALE = 8;
export const DOUBLE_TAP_SCALE = 2.5;
export const DOUBLE_TAP_DELAY_MS = 300;

export function clampScale(value) {
  if (!Number.isFinite(value)) return MIN_SCALE;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

export function panLimits(viewWidth, viewHeight, scale) {
  const s = clampScale(scale);
  return {
    x: Math.max(0, (viewWidth * (s - 1)) / 2),
    y: Math.max(0, (viewHeight * (s - 1)) / 2),
  };
}

export function clampPan(px, py, viewWidth, viewHeight, scale) {
  const limits = panLimits(viewWidth, viewHeight, scale);
  return {
    x: Math.min(limits.x, Math.max(-limits.x, px)),
    y: Math.min(limits.y, Math.max(-limits.y, py)),
  };
}

export function zoomAt(view, focalX, focalY, newScale, viewWidth, viewHeight) {
  const scale = clampScale(newScale);
  if (scale === MIN_SCALE) return { scale, x: 0, y: 0 };
  const ratio = scale / view.scale;
  const pan = clampPan(
    focalX - (focalX - view.x) * ratio,
    focalY - (focalY - view.y) * ratio,
    viewWidth,
    viewHeight,
    scale,
  );
  return { scale, ...pan };
}

export function panBy(view, dx, dy, viewWidth, viewHeight) {
  if (view.scale <= MIN_SCALE) return view;
  const pan = clampPan(view.x + dx, view.y + dy, viewWidth, viewHeight, view.scale);
  return { ...view, ...pan };
}

export function doubleTapTarget(currentScale) {
  return currentScale > MIN_SCALE + 0.01 ? MIN_SCALE : DOUBLE_TAP_SCALE;
}

export function pinchDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function pinchMidpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
