<script>
  import ToolShell from "../components/ToolShell.svelte";
  import { formatSize, IEC_UNITS } from "../lib/filesize.js";
  import { t, onLangChange } from "../lib/i18n.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.imgcomp);
  const ic = $derived(s.imgcomp);

  let file = $state(null); // { name, type, size, url, w, h }
  let format = $state("webp"); // webp | jpeg | png | original
  let quality = $state(0.8);
  let out = $state(null); // { blob, url, size, ext }
  let busy = $state(false);
  let error = $state("");

  const MIMES = { webp: "image/webp", jpeg: "image/jpeg", png: "image/png" };
  const lossy = $derived(format === "webp" || format === "jpeg" || (format === "original" && file && file.type !== "image/png"));

  async function pick(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { error = ic.notImage; return; }
    error = "";
    if (file?.url) URL.revokeObjectURL(file.url);
    if (out?.url) URL.revokeObjectURL(out.url);
    out = null;
    const url = URL.createObjectURL(f);
    try {
      const bmp = await createImageBitmap(f);
      file = { name: f.name, type: f.type, size: f.size, url, blob: f, w: bmp.width, h: bmp.height };
      bmp.close();
    } catch {
      URL.revokeObjectURL(url);
      file = null;
      error = ic.badImage;
    }
  }

  $effect(() => {
    // Re-encode whenever inputs change; debounce via microtask batching.
    file; format; quality;
    if (!file) { out = null; return; }
    let cancelled = false;
    (async () => {
      busy = true;
      try {
        const bmp = await createImageBitmap(file.blob);
        const canvas = document.createElement("canvas");
        canvas.width = bmp.width;
        canvas.height = bmp.height;
        const ctx = canvas.getContext("2d");
        if (MIMES[format] === "image/jpeg" || (format === "original" && file.type === "image/jpeg")) {
          ctx.fillStyle = "#ffffff"; // jpeg has no alpha — flatten on white
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(bmp, 0, 0);
        bmp.close();
        const mime = format === "original" ? file.type : MIMES[format];
        const blob = await new Promise((res) => canvas.toBlob(res, mime, quality));
        if (cancelled || !blob) return;
        if (out?.url) URL.revokeObjectURL(out.url);
        const ext = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/avif": "avif" }[blob.type] || "img";
        out = { blob, url: URL.createObjectURL(blob), size: blob.size, ext, type: blob.type };
      } finally {
        if (!cancelled) busy = false;
      }
    })();
    return () => (cancelled = true);
  });

  const ratio = $derived(file && out ? (1 - out.size / file.size) * 100 : null);

  function download() {
    if (!out || !file) return;
    const a = document.createElement("a");
    a.href = out.url;
    a.download = file.name.replace(/\.[^.]+$/, "") + "." + out.ext;
    a.click();
  }
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <input type="file" accept="image/*" onchange={pick} class="dbx-input" />
    {#if error}<p class="err">{error}</p>{/if}
    {#if file}
      <p class="meta">{file.name} · {file.w}×{file.h} · {file.type} · {formatSize(file.size, IEC_UNITS)}</p>
      <div class="row">
        <label class="dbx-label" for="ic-fmt" style="margin:0">{ic.format}</label>
        <select id="ic-fmt" class="dbx-input narrow" bind:value={format}>
          <option value="original">{ic.fmtOriginal}</option>
          <option value="webp">WebP</option>
          <option value="jpeg">JPEG</option>
          <option value="png">PNG</option>
        </select>
      </div>
      {#if lossy}
        <div class="row">
          <label class="dbx-label" for="ic-q" style="margin:0">{ic.quality}: {Math.round(quality * 100)}%</label>
          <input id="ic-q" type="range" min="0.1" max="1" step="0.05" bind:value={quality} />
        </div>
      {/if}
    {/if}
  </div>

  {#if file && out}
    <div class="dbx-card">
      <div class="imgs">
        <figure><img src={file.url} alt="src" /><figcaption>{ic.before} · {formatSize(file.size, IEC_UNITS)}</figcaption></figure>
        <figure><img src={out.url} alt="out" /><figcaption>{ic.after} · {out.type.split("/")[1].toUpperCase()} · {formatSize(out.size, IEC_UNITS)}</figcaption></figure>
      </div>
      <p class="meta">
        {#if ratio > 0}{ic.saved}: <b>{ratio.toFixed(1)}%</b>{:else}{ic.grew}: <b>{(-ratio).toFixed(1)}%</b>{/if}
      </p>
      <div><button type="button" class="dbx-btn primary" onclick={download} disabled={busy}>{ic.download}</button></div>
    </div>
  {/if}
</ToolShell>

<style>
  .dbx-card { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
  .row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
  .row input[type="range"] { flex: 1; min-width: 140px; }
  .narrow { width: 140px; flex: none; }
  .meta { margin: 0; font-size: 13px; color: var(--color-text-secondary, #64748b); }
  .meta b { color: var(--color-text, #0f172a); }
  .imgs { display: flex; gap: 14px; flex-wrap: wrap; }
  figure { margin: 0; flex: 1; min-width: 160px; }
  figure img { width: 100%; border: 1px solid var(--color-border, #e2e8f0); border-radius: 8px; background: repeating-conic-gradient(#e2e8f0 0 25%, #fff 0 50%) 0 0/16px 16px; }
  figcaption { font-size: 12px; color: var(--color-text-secondary, #64748b); margin-top: 4px; text-align: center; }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; margin: 0; }
</style>
