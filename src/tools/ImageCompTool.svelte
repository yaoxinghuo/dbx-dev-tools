<script>
  import ToolShell from "../components/ToolShell.svelte";
  import { formatSize, IEC_UNITS } from "../lib/filesize.js";
  import { saveFile } from "../lib/bridge.js";
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

  // Transform state (all optional; defaults are no-ops).
  let rotate = $state(0); // 0 | 90 | 180 | 270
  let flip = $state("none"); // none | h | v
  let cropEnabled = $state(false);
  let crop = $state({ x: 0, y: 0, w: 0, h: 0 });
  let watermark = $state("");
  let wmCorner = $state("br"); // tl | tr | bl | br
  let wmSize = $state(4); // % of min(w,h)

  const MIMES = { webp: "image/webp", jpeg: "image/jpeg", png: "image/png" };
  const lossy = $derived(format === "webp" || format === "jpeg" || (format === "original" && file && file.type !== "image/png"));
  const transformed = $derived(rotate !== 0 || flip !== "none" || (cropEnabled && +crop.x + +crop.y + +crop.w + +crop.h > 0 && crop.w > 0 && crop.h > 0) || watermark.trim() !== "");

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
      crop = { x: 0, y: 0, w: bmp.width, h: bmp.height };
      bmp.close();
    } catch {
      URL.revokeObjectURL(url);
      file = null;
      error = ic.badImage;
    }
  }

  // Draws the source image with rotation/flip/crop/watermark onto a canvas.
  function drawTransformed(bmp) {
    const sx = cropEnabled ? Math.max(0, Math.min(file.w - 1, Math.round(crop.x))) : 0;
    const sy = cropEnabled ? Math.max(0, Math.min(file.h - 1, Math.round(crop.y))) : 0;
    const sw = cropEnabled ? Math.max(1, Math.min(file.w - sx, Math.round(crop.w))) : file.w;
    const sh = cropEnabled ? Math.max(1, Math.min(file.h - sy, Math.round(crop.h))) : file.h;
    const swap = rotate === 90 || rotate === 270;
    const canvas = document.createElement("canvas");
    canvas.width = swap ? sh : sw;
    canvas.height = swap ? sw : sh;
    const ctx = canvas.getContext("2d");
    if (MIMES[format] === "image/jpeg" || (format === "original" && file.type === "image/jpeg")) {
      ctx.fillStyle = "#ffffff"; // jpeg has no alpha — flatten on white
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotate * Math.PI) / 180);
    ctx.scale(flip === "h" || flip === "hv" ? -1 : 1, flip === "v" || flip === "hv" ? -1 : 1);
    ctx.drawImage(bmp, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);
    const text = watermark.trim();
    if (text) {
      const size = Math.max(10, (Math.min(canvas.width, canvas.height) * wmSize) / 100);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.font = `600 ${size}px sans-serif`;
      const metrics = ctx.measureText(text);
      const pad = size * 0.5;
      const x = wmCorner.includes("l") ? pad : canvas.width - metrics.width - pad;
      const y = wmCorner.startsWith("t") ? pad + size : canvas.height - pad;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillRect(x - pad / 2, y - size, metrics.width + pad, size + pad / 2);
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillText(text, x, y - size * 0.15);
    }
    return canvas;
  }

  $effect(() => {
    // Re-encode whenever inputs change; debounce via microtask batching.
    file; format; quality; rotate; flip; cropEnabled; crop.x; crop.y; crop.w; crop.h; watermark; wmCorner; wmSize;
    if (!file) { out = null; return; }
    let cancelled = false;
    (async () => {
      busy = true;
      try {
        const bmp = await createImageBitmap(file.blob);
        const canvas = drawTransformed(bmp);
        bmp.close();
        const mime = format === "original" ? file.type : MIMES[format];
        const blob = await new Promise((res) => canvas.toBlob(res, mime, quality));
        if (cancelled || !blob) return;
        if (out?.url) URL.revokeObjectURL(out.url);
        const ext = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/avif": "avif" }[blob.type] || "img";
        out = { blob, url: URL.createObjectURL(blob), size: blob.size, ext, type: blob.type, w: canvas.width, h: canvas.height };
      } finally {
        if (!cancelled) busy = false;
      }
    })();
    return () => (cancelled = true);
  });

  const ratio = $derived(file && out ? (1 - out.size / file.size) * 100 : null);

  async function download() {
    if (!out || !file) return;
    const name = file.name.replace(/\.[^.]+$/, "") + "." + out.ext;
    await saveFile({ fileName: name, contentType: out.type }, new Uint8Array(await out.blob.arrayBuffer()));
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

  {#if file}
    <div class="dbx-card">
      <h2 class="dbx-section-title">{ic.transform}</h2>
      <div class="row">
        <span class="dbx-label" style="margin:0">{ic.rotate}</span>
        {#each [0, 90, 180, 270] as r}
          <button type="button" class="dbx-btn small" class:primary={rotate === r} onclick={() => (rotate = r)}>{r}°</button>
        {/each}
        <span class="dbx-label" style="margin:0">{ic.flip}</span>
        {#each ["none", "h", "v", "hv"] as f}
          <button type="button" class="dbx-btn small" class:primary={flip === f} onclick={() => (flip = f)}>{ic["flip_" + f]}</button>
        {/each}
      </div>
      <div class="row">
        <label class="check"><input type="checkbox" bind:checked={cropEnabled} /> {ic.crop}</label>
        {#if cropEnabled}
          {#each [["x", "X"], ["y", "Y"], ["w", "W"], ["h", "H"]] as [key, label]}
            <input type="number" class="dbx-input tiny" aria-label={label} bind:value={crop[key]} placeholder={label} />
          {/each}
          <button type="button" class="dbx-btn small" onclick={() => (crop = { x: 0, y: 0, w: file.w, h: file.h })}>{ic.cropReset}</button>
        {/if}
      </div>
      <div class="row">
        <input class="dbx-input" bind:value={watermark} placeholder={ic.wmPlaceholder} spellcheck="false" />
        <select class="dbx-input narrow" bind:value={wmCorner} aria-label={ic.wmCorner}>
          <option value="tl">{ic.wmCornerTl}</option><option value="tr">{ic.wmCornerTr}</option>
          <option value="bl">{ic.wmCornerBl}</option><option value="br">{ic.wmCornerBr}</option>
        </select>
        <input type="number" min="1" max="40" class="dbx-input tiny" bind:value={wmSize} aria-label={ic.wmSize} title={ic.wmSize} />
      </div>
      {#if transformed && out}
        <p class="meta">{out.w}×{out.h}</p>
      {/if}
    </div>
  {/if}

  {#if file && out}
    <div class="dbx-card">
      <div class="result-row">
        <span class="meta">
          {out.type.split("/")[1].toUpperCase()} · {formatSize(out.size, IEC_UNITS)}
          {#if ratio > 0}· {ic.saved} <b>{ratio.toFixed(1)}%</b>{:else}· {ic.grew} <b>{(-ratio).toFixed(1)}%</b>{/if}
        </span>
        <button type="button" class="dbx-btn primary" onclick={download} disabled={busy}>{ic.download}</button>
      </div>
      <div class="imgs">
        <figure><img src={file.url} alt="src" /><figcaption>{ic.before} · {formatSize(file.size, IEC_UNITS)}</figcaption></figure>
        <figure><img src={out.url} alt="out" /><figcaption>{ic.after} · {out.type.split("/")[1].toUpperCase()} · {formatSize(out.size, IEC_UNITS)}</figcaption></figure>
      </div>
    </div>
  {/if}
</ToolShell>

<style>
  .dbx-card { display: flex; flex-direction: column; gap: 12px; margin-bottom: 14px; }
  .row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .narrow { width: 110px; flex: none; }
  .tiny { width: 72px; flex: none; }
  .small { font-size: 12px; padding: 3px 10px; }
  .primary { background: var(--color-primary, #3b82f6); color: #fff; }
  .check { display: flex; align-items: center; gap: 8px; font-size: 13px; }
  .meta { margin: 0; font-size: 13px; color: var(--color-text-secondary, #64748b); }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; margin: 0; }
  .result-row { display: flex; justify-content: space-between; align-items: center; }
  .imgs { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .imgs figure { margin: 0; }
  .imgs img { max-width: 100%; max-height: 260px; border: 1px solid var(--color-border, #e2e8f0); border-radius: 8px; display: block; }
  .imgs figcaption { font-size: 12px; color: var(--color-text-secondary, #64748b); margin-top: 4px; text-align: center; }
</style>
