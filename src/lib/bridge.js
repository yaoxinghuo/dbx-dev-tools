// Thin wrappers around the injected window.dbxPlugin bridge, with fallbacks
// for the standalone dev host which does not mock host.copy / host.saveFile.

let initPayload = null;
const initListeners = new Set();
let listenersArmed = false;

function armInitCapture() {
  if (listenersArmed || typeof window === "undefined") return;
  listenersArmed = true;
  const capture = (event) => {
    initPayload = event.detail || null;
    for (const fn of initListeners) fn(initPayload);
  };
  // The production bridge dispatches on `document`, the dev host on `window`.
  document.addEventListener("dbx-plugin-init", capture);
  window.addEventListener("dbx-plugin-init", capture);
}

export function ready() {
  armInitCapture();
  return window.dbxPlugin.ready;
}

export function context() {
  return window.dbxPlugin?.context || {};
}

// The production bridge includes contributionId in the init payload; the dev
// host does not, so navigation should also honor context.tool.
export function contributionId() {
  return initPayload?.contributionId || null;
}

export function onInit(fn) {
  initListeners.add(fn);
  if (initPayload) fn(initPayload);
  return () => initListeners.delete(fn);
}

export function onContext(fn) {
  return window.dbxPlugin.onContext(fn);
}

export function locale() {
  return window.dbxPlugin?.locale || "en";
}

export function onEnvChange(fn) {
  const handler = (event) => fn(event.detail || {});
  document.addEventListener("dbx-plugin-env", handler);
  window.addEventListener("dbx-plugin-env", handler);
  return () => {
    document.removeEventListener("dbx-plugin-env", handler);
    window.removeEventListener("dbx-plugin-env", handler);
  };
}

export async function copyText(text) {
  try {
    await window.dbxPlugin.copy(text);
    return;
  } catch {}
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.style.cssText = "position:fixed;opacity:0";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}

export async function saveFile({ fileName, contentType }, data) {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  try {
    const result = await window.dbxPlugin.saveFile({ fileName, contentType }, bytes);
    return result?.path || null;
  } catch {}
  // Dev host fallback: plain browser download.
  const url = URL.createObjectURL(new Blob([bytes], { type: contentType || "application/octet-stream" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName || "download";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return fileName || null;
}

export async function openWorkbench(id, ctx) {
  return window.dbxPlugin.openWorkbench(id, ctx);
}
