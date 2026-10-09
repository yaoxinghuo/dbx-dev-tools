import { storageGet, storageSet, storageRemove } from "./storage.js";

// Consolidated tool state: one host key "devtools:state" holds
// { v, tools: { <name>: snapshot } } so the DBX sync list shows a single
// entry instead of ~44 per-tool rows.
//
// Versioning: `v` is the blob's schema/migration marker — a stored blob with
// v below STATE_VERSION runs the migration hook before serving reads.
//   v<2 → v2: legacy per-tool "state.<name>" keys are migrated into the
//             blob and the legacy keys removed.
const STATE_KEY = "state";
const STATE_VERSION = 2;
// v0 →: legacy per-tool "state.<name>" keys merged into the blob and deleted.
// v1 → v2: same sweep — v1 blobs were written by a build whose storageRemove
// fell back to null tombstones on hosts exposing delete() (not remove()), so
// stale keys may still be listed.
// A single tool's serialized snapshot beyond this stays session-only: one
// giant pasted blob must not push the shared entry past the host's 256KiB
// per-key cap and take every tool's persistence down with it.
const TOOL_CAP_BYTES = 32 * 1024;
// Whole-blob budget below the host's 256KiB per-key cap (storage.js writes
// under 200KiB): ~6 tools at TOOL_CAP would otherwise overflow the shared
// entry and demote every tool's persistence to session-only.
const BLOB_BUDGET_BYTES = 180 * 1024;

const LEGACY_KEYS = [
  "aes", "barcode", "base64", "caseconv", "cert", "chars", "chmod", "color",
  "counter", "cron", "cssgen", "dataconv", "datauri", "datecalc", "diff",
  "escape", "filesize", "hash", "http", "imagebase64", "imagecomp", "invis",
  "ipcalc", "json", "jwt", "lines", "lorem", "mojibake", "numbase", "password",
  "placeholder", "punycode", "qp", "qrcode", "regex", "rmb", "rsa", "semver",
  "sqlin", "time", "totp", "unicode", "url", "uuid",
];

let blob = {};   // live map of tool key -> snapshot
let ready = false;
// Eager: legacy cleanup must run at startup, not when the first tool
// happens to mount — otherwise the old rows linger in the sync list.
const loadPromise = load();

async function load() {
  const saved = await storageGet(STATE_KEY);
  const version = saved && typeof saved === "object" ? saved.v ?? 0 : 0;
  const tools = saved?.tools && typeof saved.tools === "object" ? saved.tools : {};
  if (version < STATE_VERSION) {
    // Migrate each legacy per-tool key into the blob, then delete it so the
    // host's sync list actually shrinks — just writing the new key would
    // leave the old rows in place forever.
    await Promise.all(
      LEGACY_KEYS.map(async (k) => {
        const legacy = await storageGet(`state.${k}`);
        // Null tombstones (left by a remove-less bridge) also read back as
        // null — indistinguishable from unset — so delete unconditionally;
        // hosts treat deleting an unset key as a no-op.
        if (legacy !== null && legacy !== undefined && tools[k] === undefined) {
          // The per-tool cap applies to migrated data too — a legacy snapshot
          // holding a pasted megabyte blob (e.g. image base64) would push the
          // shared entry past the host's per-key cap and break persistence
          // for every tool.
          if (JSON.stringify(legacy).length <= TOOL_CAP_BYTES) tools[k] = legacy;
        }
        await storageRemove(`state.${k}`);
      }),
    );
  }
  blob = tools;
  ready = true;
  commit(); // persist migrated shape + v marker right away
}

function commit() {
  if (ready) storageSet(STATE_KEY, { v: STATE_VERSION, tools: blob });
}

export function persistState(key, { get, set }) {
  let loaded = $state(false);
  loadPromise.then(() => {
    try {
      const saved = blob[key];
      // A snapshot from a different version may not fit the current shape —
      // keep the defaults rather than break the tool.
      if (saved !== null && saved !== undefined && typeof saved === "object") set(saved);
    } catch {} finally {
      loaded = true;
    }
  });
  $effect(() => {
    const snapshot = get();
    if (!loaded) return;
    if (JSON.stringify(snapshot).length > TOOL_CAP_BYTES) {
      if (key in blob) {
        delete blob[key];
        commit();
      }
      return;
    }
    const prev = blob[key];
    blob[key] = snapshot;
    // If this update would overflow the shared blob, roll back just this
    // tool — the cost lands on the tool holding the big input, not on all 44.
    if (JSON.stringify({ v: STATE_VERSION, tools: blob }).length > BLOB_BUDGET_BYTES) {
      if (prev === undefined) delete blob[key];
      else blob[key] = prev;
      return;
    }
    commit();
  });
}
