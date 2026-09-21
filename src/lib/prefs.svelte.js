import { untrack } from "svelte";
import { SvelteSet } from "svelte/reactivity";
import { storageGet, storageSet } from "./storage.js";

const RECENT_MAX = 10;

// $state only proxies plain objects/arrays — a Set passed through it stays a
// raw, non-reactive Set. SvelteSet is the reactive implementation.
const favorites = new SvelteSet();
const recent = $state([]);

const ready = (async () => {
  const fav = await storageGet("favorites");
  if (Array.isArray(fav)) for (const key of fav) if (typeof key === "string") favorites.add(key);
  const rec = await storageGet("recent");
  if (Array.isArray(rec)) recent.push(...rec.filter((key) => typeof key === "string").slice(0, RECENT_MAX));
})();

export function isFavorite(key) {
  return favorites.has(key);
}

export function toggleFavorite(key) {
  // Reads+writes favorites; untracked so callers inside $effect don't end up
  // depending on the very signal this mutates (self-invalidation loop).
  untrack(() => {
    if (favorites.has(key)) favorites.delete(key);
    else favorites.add(key);
    storageSet("favorites", [...favorites]);
  });
}

export function recentKeys() {
  return recent;
}

export function recordRecent(key) {
  untrack(() => {
    const index = recent.indexOf(key);
    if (index >= 0) recent.splice(index, 1);
    recent.unshift(key);
    if (recent.length > RECENT_MAX) recent.length = RECENT_MAX;
    storageSet("recent", [...recent]);
  });
}

// Tests and callers that must observe the restored snapshot await this.
export function prefsReady() {
  return ready;
}
