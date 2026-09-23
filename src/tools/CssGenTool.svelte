<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { t, onLangChange } from "../lib/i18n.js";
  import { persistState } from "../lib/persist.svelte.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.cssgen);
  const c = $derived(s.cssgen);

  let tab = $state("gradient"); // gradient | shadow

  // ── Gradient ────────────────────────────────────────────────────────────
  let gType = $state("linear"); // linear | radial | conic
  let gAngle = $state(135);
  let stops = $state([
    { color: "#0d9488", pos: 0 },
    { color: "#3b82f6", pos: 100 },
  ]);

  const gCss = $derived.by(() => {
    const parts = stops
      .slice()
      .sort((a, b) => a.pos - b.pos)
      .map((st) => `${st.color} ${st.pos}%`)
      .join(", ");
    if (gType === "linear") return `linear-gradient(${gAngle}deg, ${parts})`;
    if (gType === "radial") return `radial-gradient(circle, ${parts})`;
    return `conic-gradient(from ${gAngle}deg, ${parts})`;
  });

  function addStop() {
    const last = stops[stops.length - 1];
    stops = [...stops, { color: "#ffffff", pos: Math.min(100, (last?.pos ?? 0) + 25) }];
  }
  function removeStop(i) {
    if (stops.length <= 2) return;
    stops = stops.filter((_, idx) => idx !== i);
  }

  // ── Box shadow ──────────────────────────────────────────────────────────
  let shX = $state(0);
  let shY = $state(8);
  let shBlur = $state(24);
  let shSpread = $state(0);
  let shColor = $state("#000000");
  let shAlpha = $state(25);
  let shInset = $state(false);
  let shRadius = $state(12);

  function hexAlpha(hex, a) {
    const v = Math.round(Math.max(0, Math.min(100, a)) * 2.55).toString(16).padStart(2, "0");
    return hex + v;
  }
  const shCss = $derived(
    `box-shadow: ${shInset ? "inset " : ""}${shX}px ${shY}px ${shBlur}px ${shSpread}px ${hexAlpha(shColor, shAlpha)};` +
      (shRadius ? `\nborder-radius: ${shRadius}px;` : ""),
  );

  persistState("cssgen", {
    get: () => ({ tab, gType, gAngle, stops, shX, shY, shBlur, shSpread, shColor, shAlpha, shInset, shRadius }),
    set: (v) => {
      tab = v.tab ?? tab;
      gType = v.gType ?? gType;
      gAngle = v.gAngle ?? gAngle;
      stops = Array.isArray(v.stops) && v.stops.length >= 2 ? v.stops : stops;
      shX = v.shX ?? shX;
      shY = v.shY ?? shY;
      shBlur = v.shBlur ?? shBlur;
      shSpread = v.shSpread ?? shSpread;
      shColor = v.shColor ?? shColor;
      shAlpha = v.shAlpha ?? shAlpha;
      shInset = v.shInset ?? shInset;
      shRadius = v.shRadius ?? shRadius;
    },
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="seg">
    <button type="button" class="seg-btn" class:active={tab === "gradient"} onclick={() => (tab = "gradient")}>{c.tabGradient}</button>
    <button type="button" class="seg-btn" class:active={tab === "shadow"} onclick={() => (tab = "shadow")}>{c.tabShadow}</button>
  </div>

  {#if tab === "gradient"}
    <div class="dbx-card">
      <div class="opts">
        <label class="check"><input type="radio" bind:group={gType} value="linear" /> linear</label>
        <label class="check"><input type="radio" bind:group={gType} value="radial" /> radial</label>
        <label class="check"><input type="radio" bind:group={gType} value="conic" /> conic</label>
        {#if gType !== "radial"}
          <label class="slider">
            <span class="dbx-label">{c.angle}</span>
            <input type="range" min="0" max="360" bind:value={gAngle} />
            <span class="val mono">{gAngle}°</span>
          </label>
        {/if}
      </div>
      <div class="stops">
        {#each stops as st, i}
          <div class="stop">
            <input type="color" class="picker" bind:value={st.color} />
            <input class="dbx-input mono pos" type="number" min="0" max="100" bind:value={st.pos} />
            <span class="pct">%</span>
            <button type="button" class="dbx-btn small" onclick={() => removeStop(i)} disabled={stops.length <= 2} title={c.removeStop}>✕</button>
          </div>
        {/each}
        <button type="button" class="dbx-btn" onclick={addStop}>+ {c.addStop}</button>
      </div>
    </div>
    <div class="preview" style="background:{gCss}"></div>
    <div class="dbx-card">
      <div class="cardhead">
        <h2 class="dbx-section-title">CSS</h2>
        <CopyButton text={`background: ${gCss};`} small />
      </div>
      <pre class="out mono">background: {gCss};</pre>
    </div>
  {:else}
    <div class="dbx-card">
      <div class="grid">
        <label class="slider"><span class="dbx-label">X</span><input type="range" min="-50" max="50" bind:value={shX} /><span class="val mono">{shX}px</span></label>
        <label class="slider"><span class="dbx-label">Y</span><input type="range" min="-50" max="50" bind:value={shY} /><span class="val mono">{shY}px</span></label>
        <label class="slider"><span class="dbx-label">{c.blur}</span><input type="range" min="0" max="100" bind:value={shBlur} /><span class="val mono">{shBlur}px</span></label>
        <label class="slider"><span class="dbx-label">{c.spread}</span><input type="range" min="-50" max="50" bind:value={shSpread} /><span class="val mono">{shSpread}px</span></label>
        <label class="slider"><span class="dbx-label">{c.opacity}</span><input type="range" min="0" max="100" bind:value={shAlpha} /><span class="val mono">{shAlpha}%</span></label>
        <label class="slider"><span class="dbx-label">{c.radius}</span><input type="range" min="0" max="60" bind:value={shRadius} /><span class="val mono">{shRadius}px</span></label>
      </div>
      <div class="opts">
        <input type="color" class="picker" bind:value={shColor} />
        <label class="check"><input type="checkbox" bind:checked={shInset} /> inset</label>
      </div>
    </div>
    <div class="stage">
      <div class="shadowbox" style="box-shadow:{shInset ? 'inset ' : ''}{shX}px {shY}px {shBlur}px {shSpread}px {hexAlpha(shColor, shAlpha)};border-radius:{shRadius}px"></div>
    </div>
    <div class="dbx-card">
      <div class="cardhead">
        <h2 class="dbx-section-title">CSS</h2>
        <CopyButton text={shCss} small />
      </div>
      <pre class="out mono">{shCss}</pre>
    </div>
  {/if}
</ToolShell>

<style>
  .seg { display: inline-flex; border: 1px solid var(--color-border, #e2e8f0); border-radius: 8px; overflow: hidden; margin-bottom: 14px; }
  .seg-btn { padding: 6px 14px; font-size: 13px; background: transparent; border: none; color: var(--color-text-secondary, #64748b); cursor: pointer; }
  .seg-btn.active { background: var(--color-primary, #3b82f6); color: #fff; }
  .dbx-card { display: flex; flex-direction: column; gap: 12px; margin-bottom: 14px; }
  .opts { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; }
  .slider { display: flex; align-items: center; gap: 8px; font-size: 13px; }
  .slider input[type="range"] { width: 120px; accent-color: var(--color-primary, #0d9488); }
  .val { min-width: 44px; text-align: right; font-size: 12px; color: var(--color-muted-foreground, #64748b); }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px 18px; }
  .stops { display: flex; flex-direction: column; gap: 8px; }
  .stop { display: flex; align-items: center; gap: 8px; }
  .picker { width: 40px; height: 32px; padding: 0; border: 1px solid var(--color-border, #e2e8f0); border-radius: 6px; background: transparent; cursor: pointer; }
  .pos { width: 70px; }
  .pct { font-size: 12px; color: var(--color-muted-foreground, #64748b); }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .preview { height: 140px; border-radius: 12px; border: 1px solid var(--color-border, #e2e8f0); margin: 14px 0; }
  .stage { display: flex; align-items: center; justify-content: center; height: 160px; margin: 14px 0; border-radius: 12px; border: 1px dashed var(--color-border, #e2e8f0); background: var(--color-muted, #f4f4f5); }
  .shadowbox { width: 140px; height: 90px; background: var(--color-card, #fff); }
  .cardhead { display: flex; align-items: center; justify-content: space-between; }
  .out { margin: 0; padding: 10px; background: var(--color-muted, #f4f4f5); border-radius: 8px; overflow-x: auto; white-space: pre-wrap; font-size: 12px; }
</style>
