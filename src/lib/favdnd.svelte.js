import { moveFavorite, isFavorite } from "./prefs.svelte.js";

// Pointer-driven favorites reorder shared by the sidebar list and the home
// grid. HTML5 DnD inside the host's sandboxed iframe (srcdoc +
// sandbox="allow-scripts", WKWebView) dispatches dragstart but often no
// dragover/drop — the drag ghost shows while nothing lands — so sorting is
// driven by plain pointer events instead: >6px of movement becomes a drag,
// the item under the pointer is the insertion point (past its midpoint
// inserts after it, which is how the end position stays reachable), and a
// fixed-position ghost rendered by the caller follows the pointer.
export const dnd = $state({ key: null, moved: false, x: 0, y: 0, w: 0, h: 0, origin: null });

if (typeof window !== "undefined") {
  // Any new press re-arms click suppression, including presses on elements
  // that never started a drag.
  window.addEventListener("pointerdown", () => (dnd.moved = false), true);
}

// `origin` ("nav" | "home") tells the caller which ghost variant to render.
export function favPointerDown(e, key, origin) {
  if (e.button !== 0) return;
  const srcEl = e.currentTarget;
  const rect = srcEl.getBoundingClientRect();
  const startX = e.clientX;
  const startY = e.clientY;
  // Grab offset keeps the ghost under the pointer where it was picked up.
  const offsetX = startX - rect.left;
  const offsetY = startY - rect.top;
  const move = (ev) => {
    if (!dnd.key) {
      if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) < 6) return;
      dnd.key = key;
      dnd.origin = origin;
      dnd.w = rect.width;
      dnd.h = rect.height;
      // Capture keeps move/up events flowing to this document even when the
      // pointer leaves the iframe bounds mid-drag.
      srcEl.setPointerCapture?.(e.pointerId);
    }
    dnd.x = ev.clientX - offsetX;
    dnd.y = ev.clientY - offsetY;
    document.getSelection()?.removeAllRanges(); // dragging must not select text
    const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.("[data-favkey]");
    const over = el?.dataset?.favkey;
    if (!over || over === key || !isFavorite(over)) return;
    const r = el.getBoundingClientRect();
    // Pointer is always inside `r`; grid cells also split left/right.
    const after = ev.clientY > r.top + r.height / 2 || (origin === "home" && ev.clientX > r.left + r.width / 2);
    moveFavorite(key, over, after);
  };
  const done = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", done);
    window.removeEventListener("pointercancel", done);
    if (dnd.key) dnd.moved = true; // swallow the click that tails a drag
    dnd.key = null;
    dnd.origin = null;
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", done);
  window.addEventListener("pointercancel", done);
}
