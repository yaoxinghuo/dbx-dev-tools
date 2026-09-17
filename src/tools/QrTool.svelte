<script>
  import ToolShell from "../components/ToolShell.svelte";
  import { qrSvg, svgToPngBytes } from "../lib/qrcode.js";
  import { saveFile } from "../lib/bridge.js";
  import { t, onLangChange } from "../lib/i18n.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.qrcode);
  const q = $derived(s.qr);

  let content = $state("");
  let ecLevel = $state("M");
  let scale = $state(6);
  let margin = $state(4);
  let svg = $state("");
  let error = $state("");

  $effect(() => {
    error = "";
    svg = "";
    if (!content) return;
    try {
      svg = qrSvg(content, { ecLevel, scale, margin });
    } catch (e) {
      error = /too long|code length overflow/i.test(String(e)) ? q.tooLong : q.invalid;
    }
  });

  function downloadSvg() {
    saveFile({ fileName: "qrcode.svg", contentType: "image/svg+xml" }, exportSvg());
  }

  async function downloadPng() {
    const bytes = await svgToPngBytes(exportSvg(), 2);
    await saveFile({ fileName: "qrcode.png", contentType: "image/png" }, bytes);
  }

  // Exported files need explicit black-on-white, not theme-currentColor.
  function exportSvg() {
    return svg.replaceAll('fill="currentColor"', 'fill="#000000"')
      .replace(/<svg /, '<svg style="background:#fff" ');
  }
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="grid">
    <div class="dbx-card controls">
      <label class="dbx-label" for="qr-content">{q.content}</label>
      <textarea id="qr-content" class="dbx-textarea" rows="5" bind:value={content} placeholder={q.placeholder}></textarea>
      <div class="fields">
        <label>
          <span class="dbx-label">{q.ecLevel}</span>
          <select class="dbx-select" bind:value={ecLevel}>
            <option value="L">L · 7%</option>
            <option value="M">M · 15%</option>
            <option value="Q">Q · 25%</option>
            <option value="H">H · 30%</option>
          </select>
        </label>
        <label>
          <span class="dbx-label">{q.scale}: {scale}px</span>
          <input type="range" min="2" max="12" bind:value={scale} />
        </label>
        <label>
          <span class="dbx-label">{q.margin}: {margin}</span>
          <input type="range" min="0" max="8" bind:value={margin} />
        </label>
      </div>
      {#if svg}
        <div class="actions">
          <button type="button" class="dbx-btn" onclick={downloadSvg}>{s.downloadSvg}</button>
          <button type="button" class="dbx-btn dbx-btn--primary" onclick={downloadPng}>{s.downloadPng}</button>
        </div>
      {/if}
    </div>
    <div class="preview dbx-card">
      {#if error}
        <p class="err">{error}</p>
      {:else if svg}
        <div class="qr-box">{@html svg}</div>
      {:else}
        <p class="dbx-hint">{q.placeholder}</p>
      {/if}
    </div>
  </div>
</ToolShell>

<style>
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start; }
  @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } }
  .controls { display: flex; flex-direction: column; gap: 12px; }
  .fields { display: flex; flex-direction: column; gap: 10px; }
  .fields label { display: flex; flex-direction: column; gap: 6px; }
  .actions { display: flex; gap: 8px; }
  .preview { display: flex; justify-content: center; align-items: center; min-height: 240px; }
  .qr-box { color: #000; background: #fff; padding: 16px; border-radius: 8px; line-height: 0; }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; }
</style>
