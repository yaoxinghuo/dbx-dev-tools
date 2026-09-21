import { storageGet, storageSet } from "./storage.js";

// Persist one tool's serializable state under a single key. `get` runs inside
// an $effect so every field it reads is tracked; `set` applies the stored
// snapshot once it loads. Nothing is written until the first read resolves,
// so defaults never clobber saved state.
export function persistState(key, { get, set }) {
  let loaded = $state(false);
  storageGet(`state.${key}`).then((saved) => {
    try {
      if (saved !== null && saved !== undefined && typeof saved === "object") set(saved);
    } catch {
      // A snapshot from a different version may not fit the current shape —
      // keep the defaults rather than break the tool.
    } finally {
      loaded = true;
    }
  });
  $effect(() => {
    const snapshot = get();
    if (loaded) storageSet(`state.${key}`, snapshot);
  });
}
