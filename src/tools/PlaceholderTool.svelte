<script>
  import ToolShell from "../components/ToolShell.svelte";
  import { saveFile } from "../lib/bridge.js";
  import { formatSize, IEC_UNITS } from "../lib/filesize.js";
  import { t, onLangChange } from "../lib/i18n.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.placeholder);
  const p = $derived(s.placeholder);

  let width = $state(400);
  let height = $state(300);
  let format = $state("png");
  let text = $state("");
  let bg = $state("#94a3b8");
  let fg = $state("#ffffff");
  let out = $state(null); // { blob, url, ext, type }
  let busy = $state(false);

  const MIMES = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp" };

  async function render() {
    busy = true;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(8000, Math.max(1, Math.round(width) || 1));
      canvas.height = Math.min(8000, Math.max(1, Math.round(height) || 1));
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const label = text.trim() || `${canvas.width}×${canvas.height}`;
      const size = Math.max(12, Math.min(canvas.width, canvas.height) / 6);
      ctx.font = `600 ${size}px ${getComputedStyle(document.documentElement).getPropertyValue("--font-sans") || "sans-serif"}`;
      ctx.fillStyle = fg;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, canvas.width / 2, canvas.height / 2);
      if (MIMES[format] === "image/jpeg") {
        // JPEG has no alpha — fg text on bg is fine, no flattening needed.
      }
      const blob = await new Promise((res) => canvas.toBlob(res, MIMES[format], 0.9));
      if (out?.url) URL.revokeObjectURL(out.url);
      out = blob ? { blob, url: URL.createObjectURL(blob), ext: format, type: blob.type } : null;
    } finally {
      busy = false;
    }
  }

  async function download() {
    if (!out) return;
    await saveFile({ fileName: `placeholder-${width}x${height}.${out.ext}`, contentType: out.type }, new Uint8Array(await out.blob.arrayBuffer()));
  }
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card controls">
    <div class="opts">
      <div class="opt">
        <label class="dbx-label" for="ph-w">{p.width}</label>
        <input id="ph-w" type="number" min="1" max="8000" class="dbx-input narrow" bind:value={width} />
      </div>
      <span class="times">×</span>
      <div class="opt">
        <label class="dbx-label" for="ph-h">{p.height}</label>
        <input id="ph-h" type="number" min="1" max="8000" class="dbx-input narrow" bind:value={height} />
      </div>
      <div class="opt">
        <label class="dbx-label" for="ph-fmt">{p.format}</label>
        <select id="ph-fmt" class="dbx-input narrow" bind:value={format}>
          <option value="png">PNG</option><option value="jpeg">JPEG</option><option value="webp">WebP</option>
        </select>
      </div>
      <div class="opt">
        <label class="dbx-label" for="ph-bg">{p.bg}</label>
        <input id="ph-bg" type="color" class="picker" bind:value={bg} />
      </div>
      <div class="opt">
        <label class="dbx-label" for="ph-fg">{p.fg}</label>
        <input id="ph-fg" type="color" class="picker" bind:value={fg} />
      </div>
    </div>
    <label class="dbx-label" for="ph-text">{p.text}</label>
    <input id="ph-text" class="dbx-input" bind:value={text} placeholder="400×300" spellcheck="false" />
    <button type="button" class="dbx-btn primary" onclick={render} disabled={busy}>{p.generate}</button>
  </div>

  {#if out}
    <div class="dbx-card">
      <div class="result-row">
        <span class="meta">{out.type.split("/")[1].toUpperCase()} · {formatSize(out.blob.size, IEC_UNITS)}</span>
        <button type="button" class="dbx-btn primary" onclick={download}>{s.downloadPng}</button>
      </div>
      <div class="preview-wrap"><img src={out.url} alt="placeholder" /></div>
    </div>
  {/if}
</ToolShell>

<style>
  .controls { display: flex; flex-direction: column; gap: 12px; }
  .opts { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; }
  .opt { display: flex; gap: 8px; align-items: center; }
  .narrow { width: 100px; }
  .times { color: var(--color-text-secondary, #64748b); }
  .picker { width: 40px; height: 32px; padding: 0; border: 1px solid var(--color-border, #e2e8f0); border-radius: 6px; background: transparent; cursor: pointer; }
  .result-row { display: flex; justify-content: space-between; align-items: center; }
  .meta { font-size: 13px; color: var(--color-text-secondary, #64748b); }
  .preview-wrap { display: flex; justify-content: center; padding: 12px; border: 1px dashed var(--color-border, #e2e8f0); border-radius: 8px; max-height: 320px; }
  .preview-wrap img { max-width: 100%; max-height: 296px; }
</style>
