<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { t, onLangChange } from "../lib/i18n.js";
  import { persistState } from "../lib/persist.svelte.js";
  import { saveFile } from "../lib/bridge.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.imgb64);
  const u = $derived(s.imgb64);

  let mode = $state("encode");
  let includePrefix = $state(true);

  // encode state
  let dragOver = $state(false);
  let encError = $state("");
  let base64 = $state("");
  let previewUrl = $state("");
  let meta = $state(null); // { name, mime, size, dims, b64Len }
  let fileInput = $state();

  // decode state
  let decInput = $state("");
  let decError = $state("");
  let decUrl = $state("");
  let decMeta = $state(null);
  let decBytes = $state(null);
  let decMime = $state("");

  const MIME_EXT = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/bmp": "bmp",
    "image/x-icon": "ico",
    "image/svg+xml": "svg",
    "image/avif": "avif",
  };

  function bytesToBase64(bytes) {
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    return btoa(binary);
  }

  // Magic-byte sniffing; pasted Base64 rarely carries a reliable data URI.
  function sniffMime(bytes) {
    const sig = [...bytes.subarray(0, 12)].map((b) => b.toString(16).padStart(2, "0")).join(" ");
    if (sig.startsWith("89 50 4e 47")) return "image/png";
    if (sig.startsWith("ff d8 ff")) return "image/jpeg";
    if (sig.startsWith("47 49 46")) return "image/gif";
    if (sig.startsWith("42 4d")) return "image/bmp";
    if (sig.startsWith("00 00 01 00")) return "image/x-icon";
    if (sig.startsWith("52 49 46 46") && sig.slice(24) === "57 45 42 50") return "image/webp";
    const head = new TextDecoder().decode(bytes.subarray(0, 256)).trimStart();
    if (head.startsWith("<svg") || head.startsWith("<?xml")) return "image/svg+xml";
    return "application/octet-stream";
  }

  function fmtSize(n) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(2)} MB`;
  }

  function revoke(url) {
    if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
  }

  function loadImageMeta(url, cb) {
    const img = new Image();
    img.onload = () => cb(`${img.naturalWidth}×${img.naturalHeight}`);
    img.onerror = () => cb(null);
    img.src = url;
  }

  async function encodeFile(file) {
    if (!file) return;
    encError = "";
    if (!file.type.startsWith("image/")) {
      encError = u.notImage;
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const raw = bytesToBase64(bytes);
    const uri = `data:${file.type};base64,${raw}`;
    base64 = raw;
    revoke(previewUrl);
    previewUrl = uri;
    loadImageMeta(uri, (dims) => {
      meta = { name: file.name, mime: file.type, size: file.size, dims, b64Len: raw.length };
    });
  }

  const output = $derived(includePrefix && base64 ? `data:${meta?.mime || "image/png"};base64,${base64}` : base64);

  function onDrop(event) {
    event.preventDefault();
    dragOver = false;
    encodeFile(event.dataTransfer?.files?.[0]);
  }

  function onPaste(event) {
    if (mode !== "encode") return;
    const item = [...(event.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
    if (item) {
      event.preventDefault();
      encodeFile(item.getAsFile());
    }
  }

  $effect(() => {
    decError = "";
    revoke(decUrl);
    decUrl = "";
    decMeta = null;
    decBytes = null;
    decMime = "";
    let text = decInput.trim();
    if (!text) return;
    const comma = text.indexOf(",");
    if (text.startsWith("data:") && comma > 0) text = text.slice(comma + 1);
    text = text.replace(/\s+/g, "");
    try {
      const rem = text.length % 4;
      if (rem) text += "=".repeat(4 - rem);
      const bytes = Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
      if (!bytes.length) return;
      const mime = sniffMime(bytes);
      const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
      decBytes = bytes;
      decMime = mime;
      decUrl = url;
      loadImageMeta(url, (dims) => {
        decMeta = { size: bytes.length, dims };
      });
    } catch {
      decError = u.invalid;
    }
  });

  function download() {
    const ext = MIME_EXT[decMime] || "bin";
    saveFile({ fileName: `image.${ext}`, contentType: decMime }, decBytes);
  }
  // File-derived payloads (base64, previews) are not persisted — they can be large.
  persistState("imagebase64", {
    get: () => ({ mode, includePrefix, decInput }),
    set: (v) => {
      mode = v.mode ?? mode;
      includePrefix = v.includePrefix ?? includePrefix;
      decInput = v.decInput ?? decInput;
    },
  });
</script>

<svelte:window onpaste={onPaste} />

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <div class="seg">
      <button type="button" class="dbx-btn" class:dbx-btn--primary={mode === "encode"} onclick={() => (mode = "encode")}>{u.encode}</button>
      <button type="button" class="dbx-btn" class:dbx-btn--primary={mode === "decode"} onclick={() => (mode = "decode")}>{u.decode}</button>
    </div>
  </div>

  {#if mode === "encode"}
    <div class="dbx-card">
      <button
        type="button"
        class="drop"
        class:over={dragOver}
        onclick={() => fileInput.click()}
        ondragover={(e) => { e.preventDefault(); dragOver = true; }}
        ondragleave={() => (dragOver = false)}
        ondrop={onDrop}
      >
        {u.dropHint} <span class="dbx-link">{u.chooseFile}</span>
      </button>
      <input bind:this={fileInput} type="file" accept="image/*" hidden onchange={(e) => encodeFile(e.target.files?.[0])} />
      <label class="check">
        <input type="checkbox" bind:checked={includePrefix} />
        <span>{u.dataUri}</span>
      </label>
      {#if encError}<p class="err">{encError}</p>{/if}
    </div>

    {#if base64}
      <div class="dbx-card">
        <div class="card-head">
          <h2 class="dbx-section-title">{s.output}</h2>
          <CopyButton text={output} small />
        </div>
        <textarea class="dbx-textarea mono" rows="5" readonly value={output}></textarea>
        <div class="meta">
          <img class="thumb" src={previewUrl} alt="" />
          <div class="facts">
            {#if meta}
              <span>{meta.name} · {meta.mime} · {fmtSize(meta.size)}{meta.dims ? ` · ${meta.dims}` : ""}</span>
              <span class="dbx-hint">{fmtSize(meta.b64Len)} Base64 (+{Math.round((meta.b64Len / meta.size - 1) * 100)}%)</span>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  {:else}
    <div class="dbx-card">
      <textarea class="dbx-textarea mono" rows="6" bind:value={decInput} placeholder={u.pastePlaceholder}></textarea>
      {#if decError}<p class="err">{decError}</p>{/if}
    </div>

    {#if decUrl}
      <div class="dbx-card">
        <div class="card-head">
          <h2 class="dbx-section-title">{u.preview}</h2>
          <button type="button" class="dbx-btn" onclick={download}>{u.download}</button>
        </div>
        <div class="meta">
          <img class="thumb" src={decUrl} alt="" />
          <div class="facts">
            <span>{decMime} · {fmtSize(decBytes.length)}{decMeta?.dims ? ` · ${decMeta.dims}` : ""}</span>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</ToolShell>

<style>
  .dbx-card { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
  .card-head { display: flex; align-items: center; justify-content: space-between; }
  .seg { display: flex; }
  .seg .dbx-btn:first-child { border-radius: 6px 0 0 6px; }
  .seg .dbx-btn:last-child { border-radius: 0 6px 6px 0; margin-left: -1px; }
  .drop {
    border: 1.5px dashed var(--color-input);
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--color-muted-foreground);
    font: inherit;
    padding: 26px 12px;
    cursor: pointer;
    text-align: center;
  }
  .drop:hover, .drop.over { border-color: var(--color-primary); color: var(--color-foreground); }
  .check { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
  .meta { display: flex; gap: 12px; align-items: center; }
  .thumb {
    max-width: 96px; max-height: 96px; border-radius: var(--radius-md);
    border: 1px solid var(--color-border); background:
      repeating-conic-gradient(#e4e4e7 0 25%, #fff 0 50%) 0 0 / 16px 16px;
  }
  .facts { display: flex; flex-direction: column; gap: 4px; font-size: 12px; }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; margin: 0; }
  textarea[readonly] { background: var(--color-muted, #f4f4f5); }
</style>
