import { untrack } from "svelte";
import { storageGet, storageSet } from "./storage.js";

const RECENT_MAX = 10;

// Favorites are an ordered array (not a Set) so users can drag-reorder them
// in the sidebar; the order is also how they sort on the home grid.
const favorites = $state([]);
const recent = $state([]);
// Sidebar "全部工具" group collapsed state; defaults to collapsed, and the
// user's toggle is persisted so it survives reloads.
let allCollapsed = $state(true);
// Whole-sidebar icon-rail mode; persisted so it survives reloads.
let navCollapsed = $state(false);

const ready = (async () => {
  const fav = await storageGet("favorites");
  if (Array.isArray(fav)) favorites.push(...fav.filter((key) => typeof key === "string"));
  const rec = await storageGet("recent");
  if (Array.isArray(rec)) recent.push(...rec.filter((key) => typeof key === "string").slice(0, RECENT_MAX));
  // `!== false` so an unset key keeps the collapsed default while a stored
  // "expanded" choice is still honored.
  allCollapsed = (await storageGet("navAllCollapsed")) !== false;
  navCollapsed = (await storageGet("navCollapsed")) === true;
})();

export function isFavorite(key) {
  return favorites.includes(key);
}

export function favoriteKeys() {
  return favorites;
}

export function toggleFavorite(key) {
  // Reads+writes favorites; untracked so callers inside $effect don't end up
  // depending on the very signal this mutates (self-invalidation loop).
  untrack(() => {
    const index = favorites.indexOf(key);
    if (index >= 0) favorites.splice(index, 1);
    else favorites.push(key); // new favorites take the tail slot
    storageSet("favorites", [...favorites]);
  });
}

// Drag-to-reorder: `key` is inserted at `overKey`'s position (before it);
// null overKey means dropped past the end.
export function moveFavorite(key, overKey) {
  untrack(() => {
    const from = favorites.indexOf(key);
    if (from < 0 || key === overKey) return;
    favorites.splice(from, 1);
    if (overKey == null) favorites.push(key);
    else favorites.splice(favorites.indexOf(overKey), 0, key);
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

export function isAllCollapsed() {
  return allCollapsed;
}

export function toggleAllCollapsed() {
  allCollapsed = !allCollapsed;
  storageSet("navAllCollapsed", allCollapsed);
}

export function isNavCollapsed() {
  return navCollapsed;
}

export function setNavCollapsed(value) {
  navCollapsed = value;
  storageSet("navCollapsed", navCollapsed);
}

// Tests and callers that must observe the restored snapshot await this.
export function prefsReady() {
  return ready;
}
