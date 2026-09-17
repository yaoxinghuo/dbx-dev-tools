<script>
  import ToolShell from "../components/ToolShell.svelte";
  import { barcodeSvg, svgToPngBytes } from "../lib/barcode.js";
  import { saveFile } from "../lib/bridge.js";
  import { t, onLangChange } from "../lib/i18n.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.barcode);
  const b = $derived(s.barcode);

  let content = $state("");
  let barWidth = $state(2);
  let height = $state(80);
  let showText = $state(true);
  let svg = $state("");
  let error = $state("");

  $effect(() => {
    error = "";
    svg = "";
    if (!content) return;
    try {
      svg = barcodeSvg(content, { barWidth, height, showText });
    } catch {
      error = b.invalid;
    }
  });

  function exportSvg() {
    return svg.replaceAll('fill="currentColor"', 'fill="#000000"')
      .replace(/<svg /, '<svg style="background:#fff" ');
  }

  function downloadSvg() {
    saveFile({ fileName: "barcode.svg", contentType: "image/svg+xml" }, exportSvg());
  }

  async function downloadPng() {
    const bytes = await svgToPngBytes(exportSvg(), 2);
    await saveFile({ fileName: "barcode.png", contentType: "image/png" }, bytes);
  }
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card controls">
    <label class="dbx-label" for="bc-content">{b.content}</label>
    <input id="bc-content" class="dbx-input" bind:value={content} placeholder={b.placeholder} />
    <div class="fields">
      <label>
        <span class="dbx-label">{b.barWidth}: {barWidth}px</span>
        <input type="range" min="1" max="5" bind:value={barWidth} />
      </label>
      <label>
        <span class="dbx-label">{b.height}: {height}px</span>
        <input type="range" min="30" max="200" bind:value={height} />
      </label>
      <label class="check"><input type="checkbox" bind:checked={showText} /> {b.showText}</label>
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
      <div class="bc-box">{@html svg}</div>
    {:else}
      <p class="dbx-hint">{b.empty}</p>
    {/if}
  </div>
</ToolShell>

<style>
  .controls { display: flex; flex-direction: column; gap: 12px; margin-bottom: 18px; }
  .fields { display: flex; gap: 24px; flex-wrap: wrap; align-items: center; }
  .fields label { display: flex; flex-direction: column; gap: 6px; }
  .fields .check { flex-direction: row; align-items: center; gap: 8px; }
  .actions { display: flex; gap: 8px; }
  .preview { display: flex; justify-content: center; align-items: center; min-height: 160px; overflow-x: auto; }
  .bc-box { color: #000; background: #fff; padding: 16px; border-radius: 8px; line-height: 0; }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; }
</style>
