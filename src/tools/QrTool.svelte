<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { qrSvg, svgToPngBytes } from "../lib/qrcode.js";
  import { saveFile } from "../lib/bridge.js";
  import { t, onLangChange } from "../lib/i18n.js";
  import { persistState } from "../lib/persist.svelte.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.qrcode);
  const q = $derived(s.qr);

  let qrMode = $state("gen"); // gen | scan
  let content = $state("");
  let ecLevel = $state("M");
  let scale = $state(6);
  let margin = $state(4);
  let logo = $state(""); // data URI
  let svg = $state("");
  let error = $state("");

  let scanImg = $state(""); // object URL preview
  let scanResults = $state([]); // [{format, text}]
  let scanErr = $state("");
  let scanning = $state(false);

  // BarcodeDetector availability varies by platform — enumerate what's
  // actually supported and degrade gracefully.
  async function pickScan(e) {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    scanResults = [];
    scanErr = "";
    if (scanImg) URL.revokeObjectURL(scanImg);
    scanImg = URL.createObjectURL(f);
    scanning = true;
    try {
      if (!("BarcodeDetector" in window)) {
        scanErr = q.scanUnsupported;
        return;
      }
      const all = ["qr_code", "data_matrix", "pdf417", "aztec", "code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e", "itf", "codabar"];
      const supported = (await BarcodeDetector.getSupportedFormats?.()) ?? ["qr_code"];
      const formats = all.filter((x) => supported.includes(x));
      const det = new BarcodeDetector({ formats: formats.length ? formats : supported });
      const bmp = await createImageBitmap(f);
      const codes = await det.detect(bmp);
      bmp.close?.();
      if (!codes.length) scanErr = q.scanNone;
      else scanResults = codes.map((c) => ({ format: c.format, text: c.rawValue }));
    } catch {
      scanErr = q.scanFail;
    } finally {
      scanning = false;
    }
  }

  function pickLogo(e) {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      logo = reader.result;
      if (ecLevel !== "H" && ecLevel !== "Q") ecLevel = "H"; // logo needs high EC to stay scannable
    };
    reader.readAsDataURL(f);
  }

  $effect(() => {
    error = "";
    svg = "";
    if (!content) return;
    try {
      svg = qrSvg(content, { ecLevel, scale, margin, logoUri: logo });
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
  // The logo data URI is intentionally excluded — it can exceed the storage cap.
  persistState("qrcode", {
    get: () => ({ qrMode, content, ecLevel, scale, margin }),
    set: (v) => {
      qrMode = v.qrMode ?? qrMode;
      content = v.content ?? content;
      ecLevel = v.ecLevel ?? ecLevel;
      scale = v.scale ?? scale;
      margin = v.margin ?? margin;
    },
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="seg">
    <button type="button" class="seg-btn" class:active={qrMode === "gen"} onclick={() => (qrMode = "gen")}>{q.gen}</button>
    <button type="button" class="seg-btn" class:active={qrMode === "scan"} onclick={() => (qrMode = "scan")}>{q.scan}</button>
  </div>

  {#if qrMode === "scan"}
    <div class="dbx-card">
      <input type="file" accept="image/*" class="dbx-input" onchange={pickScan} />
      {#if scanning}<p class="dbx-hint">…</p>{/if}
      {#if scanImg}<img src={scanImg} alt="" class="scan-img" />{/if}
      {#if scanErr}<p class="err">{scanErr}</p>{/if}
      {#each scanResults as r}
        <div class="scan-row">
          <span class="badge">{r.format}</span>
          <code class="mono scan-text">{r.text}</code>
          <CopyButton text={r.text} small />
        </div>
      {/each}
    </div>
  {/if}

  {#if qrMode === "gen"}
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
        <label>
          <span class="dbx-label">{q.logo}</span>
          <div class="logo-row">
            <input type="file" accept="image/*" onchange={pickLogo} class="dbx-input logo-input" />
            {#if logo}
              <img src={logo} alt="logo" class="logo-thumb" />
              <button type="button" class="dbx-btn" onclick={() => (logo = "")}>{q.logoClear}</button>
            {/if}
          </div>
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
  {/if}
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
  .logo-row { display: flex; align-items: center; gap: 10px; }
  .logo-input { flex: 1; }
  .logo-thumb { width: 32px; height: 32px; object-fit: contain; border: 1px solid var(--color-border, #e2e8f0); border-radius: 6px; background: #fff; }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; }
  .seg { display: flex; border: 1px solid var(--color-border, #e2e8f0); border-radius: 8px; overflow: hidden; width: fit-content; margin-bottom: 12px; }
  .seg-btn { padding: 6px 16px; font-size: 13px; background: transparent; border: none; color: var(--color-text-secondary, #64748b); cursor: pointer; }
  .seg-btn.active { background: var(--color-primary, #3b82f6); color: #fff; }
  .scan-img { max-width: 220px; max-height: 220px; object-fit: contain; border: 1px solid var(--color-border, #e2e8f0); border-radius: 8px; align-self: flex-start; }
  .scan-row { display: flex; align-items: center; gap: 8px; }
  .scan-text { flex: 1; min-width: 0; overflow-wrap: anywhere; font-size: 12px; }
  .badge { flex: none; display: inline-flex; align-items: center; height: 20px; padding: 0 8px; border-radius: 999px; font-size: 11px; font-weight: 500; background: rgba(59, 130, 246, .15); color: var(--color-primary, #3b82f6); }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
</style>
