// Persistent per-plugin KV via the host.storage bridge (declared as the
// host.storage permission, advertised through capabilities.storage). Hosts
// that predate the API — the dev host, older DBX — fall back to localStorage
// so the UI keeps working; the sandbox's opaque origin makes localStorage
// throw there, so the last resort is an in-memory map (session-only).

const PREFIX = "devtools:";
const memory = new Map();
const pending = new Map();

let initWait;
// The injected bridge exposes `storage` immediately, but `capabilities` stays
// {} until the host's init message lands (after iframe load) — `ready` resolves
// at that exact point. Backend selection must wait for it, otherwise startup
// reads run before init, pick the local/memory fallback, and never see the
// values that later writes persisted through the bridge. Bounded so a host
// that never sends init can't hang storage forever.
function bridgeReady() {
  const bridge = window.dbxPlugin;
  if (!bridge?.ready) return Promise.resolve();
  initWait ??= Promise.race([
    Promise.resolve(bridge.ready).catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
  return initWait;
}

// Host quota: 256KiB serialized per key, 1MiB total per plugin. Persisted
// states are tiny (<1KiB typical), but inputs can hold pasted blobs — a
// value over the per-key cap would be rejected on every debounced write, so
// it stays in the session memory instead.
const MAX_VALUE_BYTES = 200 * 1024;

async function backend() {
  await bridgeReady();
  const bridge = window.dbxPlugin;
  if (bridge?.capabilities?.storage && bridge.storage) return "bridge";
  try {
    localStorage.setItem("__probe__", "1");
    localStorage.removeItem("__probe__");
    return "local";
  } catch {
    return "memory";
  }
}

export async function storageGet(key) {
  try {
    const mode = await backend();
    if (mode === "bridge") return await window.dbxPlugin.storage.get(PREFIX + key);
    if (mode === "local") {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? null : JSON.parse(raw);
    }
  } catch {}
  return memory.get(PREFIX + key) ?? null;
}

async function writeNow(key, value) {
  try {
    if (JSON.stringify(value).length > MAX_VALUE_BYTES) return memory.set(PREFIX + key, value);
    const mode = await backend();
    if (mode === "bridge") return await window.dbxPlugin.storage.set(PREFIX + key, value);
    if (mode === "local") {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return;
    }
  } catch {}
  memory.set(PREFIX + key, value);
}

// Debounced per key: callers persist on every keystroke, and the bridge does
// a JSON-RPC round trip per call — collapse bursts into one write. The value
// is kept on the entry so a pending write can still flush on pagehide.
export function storageSet(key, value) {
  const existing = pending.get(key);
  if (existing) clearTimeout(existing.timer);
  const entry = { value, timer: 0 };
  entry.timer = setTimeout(() => {
    pending.delete(key);
    void writeNow(key, entry.value);
  }, 300);
  pending.set(key, entry);
}

// Closing the workbench/DBX inside the 300ms debounce window would drop the
// pending writes — flush them while the iframe can still postMessage.
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    for (const [key, entry] of pending) {
      clearTimeout(entry.timer);
      pending.delete(key);
      void writeNow(key, entry.value);
    }
  });
}
