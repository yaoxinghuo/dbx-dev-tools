// Off-main-thread regex matching so catastrophic patterns can't freeze the UI.
// The worker source is inlined and created from a Blob (allowed by the plugin
// sandbox CSP `script-src ... blob:`); falls back to sync when unavailable.

const WORKER_SOURCE = `
self.onmessage = (e) => {
  const { pattern, flags, text, replacement, maxMatches } = e.data;
  const respond = (payload) => self.postMessage({ id: e.data.id, ...payload });
  try {
    const f = flags.includes("g") ? flags : flags + "g";
    const re = new RegExp(pattern, f);
    const matches = [];
    const started = performance.now();
    for (const m of text.matchAll(re)) {
      matches.push({ index: m.index, text: m[0], groups: m.slice(1) });
      if (matches.length >= maxMatches) break;
    }
    const replaced = text.replace(re, replacement);
    respond({ matches, replaced, elapsed: performance.now() - started });
  } catch (error) {
    respond({ error: String(error && error.message || error) });
  }
};
`;

let worker = null;
let workerFailed = false;
let seq = 0;
const pending = new Map();

function ensureWorker() {
  if (worker || workerFailed) return worker;
  try {
    worker = new Worker(URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" })));
    worker.onmessage = (event) => {
      const { id, ...payload } = event.data;
      const handler = pending.get(id);
      if (!handler) return;
      pending.delete(id);
      handler(payload);
    };
    worker.onerror = () => {
      workerFailed = true;
      worker.terminate();
      worker = null;
      for (const handler of pending.values()) handler({ fallback: true });
      pending.clear();
    };
  } catch {
    workerFailed = true;
  }
  return worker;
}

export function runRegex({ pattern, flags, text, replacement, maxMatches = 500 }) {
  const target = ensureWorker();
  if (!target) return Promise.resolve(syncRun({ pattern, flags, text, replacement, maxMatches }));
  return new Promise((resolve) => {
    const id = ++seq;
    pending.set(id, resolve);
    target.postMessage({ id, pattern, flags, text, replacement, maxMatches });
    // Worker may silently die under some sandbox setups; don't hang forever.
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        resolve(syncRun({ pattern, flags, text, replacement, maxMatches }));
      }
    }, 5000);
  }).then((result) => (result && result.fallback ? syncRun({ pattern, flags, text, replacement, maxMatches }) : result));
}

function syncRun({ pattern, flags, text, replacement, maxMatches }) {
  try {
    const f = flags.includes("g") ? flags : flags + "g";
    const re = new RegExp(pattern, f);
    const matches = [];
    const started = performance.now();
    for (const m of text.matchAll(re)) {
      matches.push({ index: m.index, text: m[0], groups: m.slice(1) });
      if (matches.length >= maxMatches) break;
    }
    return { matches, replaced: text.replace(re, replacement), elapsed: performance.now() - started };
  } catch (error) {
    return { error: String(error && error.message || error) };
  }
}
