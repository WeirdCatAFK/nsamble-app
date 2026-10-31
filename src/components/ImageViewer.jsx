import { useEffect, useRef, useState } from "react";
import {
  DOUBLE_TAP_DELAY_MS,
  MIN_SCALE,
  doubleTapTarget,
  panBy,
  pinchDistance,
  pinchMidpoint,
  zoomAt,
} from "../utils/image-view.js";
import "./ImageViewer.css";

const TAP_MAX_MOVE = 10;
const TAP_MAX_DURATION_MS = 300;
const DOUBLE_TAP_MAX_DIST = 40;
const BUTTON_ZOOM_STEP = 1.25;

export default function ImageViewer({ src, alt }) {
  const containerRef = useRef(null);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const viewRef = useRef(view);
  const pointersRef = useRef(new Map());
  const downRef = useRef(null);
  const lastTapRef = useRef({ time: 0, x: 0, y: 0 });

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  // NOTE: the parent remounts this component per file (key={file.id}),
  // so no src-change reset is needed here.

  const updateView = (next) => {
    viewRef.current = typeof next === "function" ? next(viewRef.current) : next;
    setView(viewRef.current);
  };

  const measure = () => {
    const rect = containerRef.current.getBoundingClientRect();
    return { rect, cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 };
  };

  const handlePointerDown = (e) => {
    try {
      containerRef.current?.setPointerCapture?.(e.pointerId);
    } catch {
      /* capture is best-effort */
    }
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    downRef.current = pointersRef.current.size === 1
      ? { x: e.clientX, y: e.clientY, time: performance.now(), moved: false }
      : null;
  };

  const handlePointerMove = (e) => {
    const pts = pointersRef.current;
    if (!pts.has(e.pointerId)) return;
    const before = [...pts.values()];
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (downRef.current && Math.hypot(e.clientX - downRef.current.x, e.clientY - downRef.current.y) > TAP_MAX_MOVE) {
      downRef.current.moved = true;
    }

    const { rect, cx, cy } = measure();
    if (pts.size === 1) {
      const prev = before[0];
      updateView((v) => panBy(v, e.clientX - prev.x, e.clientY - prev.y, rect.width, rect.height));
    } else if (pts.size === 2) {
      const after = [...pts.values()];
      const d0 = pinchDistance(before[0], before[1]);
      const d1 = pinchDistance(after[0], after[1]);
      if (d0 > 0 && d1 > 0) {
        const mid = pinchMidpoint(after[0], after[1]);
        const focalX = mid.x - cx;
        const focalY = mid.y - cy;
        updateView((v) => zoomAt(v, focalX, focalY, (v.scale * d1) / d0, rect.width, rect.height));
      }
    }
  };

  const handlePointerUp = (e) => {
    const pts = pointersRef.current;
    const wasSingleTap = pts.size === 1 && pts.has(e.pointerId) && downRef.current && !downRef.current.moved;
    const downTime = downRef.current?.time ?? 0;
    pts.delete(e.pointerId);
    downRef.current = null;
    if (!wasSingleTap) return;

    const now = performance.now();
    if (now - downTime > TAP_MAX_DURATION_MS) return;
    const last = lastTapRef.current;
    if (now - last.time <= DOUBLE_TAP_DELAY_MS && Math.hypot(e.clientX - last.x, e.clientY - last.y) < DOUBLE_TAP_MAX_DIST) {
      const { rect, cx, cy } = measure();
      const focalX = e.clientX - cx;
      const focalY = e.clientY - cy;
      updateView((v) => zoomAt(v, focalX, focalY, doubleTapTarget(v.scale), rect.width, rect.height));
      lastTapRef.current = { time: 0, x: 0, y: 0 };
    } else {
      lastTapRef.current = { time: now, x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerCancel = (e) => {
    pointersRef.current.delete(e.pointerId);
    downRef.current = null;
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const focalX = e.clientX - (rect.left + rect.width / 2);
      const focalY = e.clientY - (rect.top + rect.height / 2);
      const factor = Math.exp(-e.deltaY * 0.0015);
      const next = zoomAt(viewRef.current, focalX, focalY, viewRef.current.scale * factor, rect.width, rect.height);
      viewRef.current = next;
      setView(next);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const zoomStep = (factor) => {
    const { rect } = measure();
    updateView((v) => zoomAt(v, 0, 0, v.scale * factor, rect.width, rect.height));
  };

  const reset = () => updateView({ scale: MIN_SCALE, x: 0, y: 0 });

  const handleKeyDown = (e) => {
    if (e.key === "+" || e.key === "=") zoomStep(BUTTON_ZOOM_STEP);
    else if (e.key === "-") zoomStep(1 / BUTTON_ZOOM_STEP);
    else if (e.key === "0") reset();
  };

  return (
    <div
      ref={containerRef}
      className={`image-viewer${view.scale > MIN_SCALE ? " zoomed" : ""}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="img"
      aria-label={`${alt || "Image"}. Drag to pan, pinch or scroll to zoom, double-tap to toggle zoom.`}
    >
      <img
        src={src}
        alt={alt || ""}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
      />
      <div className="image-viewer-controls" onPointerDown={(e) => e.stopPropagation()}>
        <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => zoomStep(1 / BUTTON_ZOOM_STEP)} disabled={view.scale <= MIN_SCALE}>
          &minus;
        </button>
        <button type="button" className="image-viewer-zoom" onClick={reset} title="Reset zoom">
          {Math.round(view.scale * 100)}%
        </button>
        <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => zoomStep(BUTTON_ZOOM_STEP)}>
          +
        </button>
      </div>
      {view.scale <= MIN_SCALE && (
        <div className="image-viewer-hint">Pinch or scroll to zoom &middot; drag to pan &middot; double-tap to zoom</div>
      )}
    </div>
  );
}
