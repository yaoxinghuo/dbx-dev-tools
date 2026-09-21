// Persistent per-plugin KV via the host.storage bridge (declared as the
// host.storage permission, advertised through capabilities.storage). Hosts
// that predate the API — the dev host, older DBX — fall back to localStorage
// so the UI keeps working; the sandbox's opaque origin makes localStorage
// throw there, so the last resort is an in-memory map (session-only).

const PREFIX = "devtools:";
const memory = new Map();
const pending = new Map();

// Host quota: 256KiB serialized per key, 1MiB total per plugin. Persisted
// states are tiny (<1KiB typical), but inputs can hold pasted blobs — a
// value over the per-key cap would be rejected on every debounced write, so
// it stays in the session memory instead.
const MAX_VALUE_BYTES = 200 * 1024;

function backend() {
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
    const mode = backend();
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
    const mode = backend();
    if (mode === "bridge") return await window.dbxPlugin.storage.set(PREFIX + key, value);
    if (mode === "local") {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return;
    }
  } catch {}
  memory.set(PREFIX + key, value);
}

// Debounced per key: callers persist on every keystroke, and the bridge does
// a JSON-RPC round trip per call — collapse bursts into one write.
export function storageSet(key, value) {
  clearTimeout(pending.get(key));
  pending.set(
    key,
    setTimeout(() => {
      pending.delete(key);
      void writeNow(key, value);
    }, 300)
  );
}
