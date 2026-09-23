<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { parseColor, describe, contrast, harmonies, toHex, luminance } from "../lib/color.js";
  import { copyText } from "../lib/bridge.js";
  import { t, onLangChange } from "../lib/i18n.js";
  import { persistState } from "../lib/persist.svelte.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.color);
  const c = $derived(s.color);

  let input = $state("#3b82f6");
  let bgInput = $state("#ffffff");

  const color = $derived(parseColor(input));
  const invalid = $derived(input.trim() !== "" && color === null);
  const info = $derived(color ? describe(color) : null);

  const WHITE = { r: 255, g: 255, b: 255 };
  const BLACK = { r: 0, g: 0, b: 0 };
  const bgCustom = $derived(parseColor(bgInput) ?? WHITE);
  const bgCustomHex = $derived(describe({ ...bgCustom, a: 1 }).hex);

  const contrasts = $derived(
    color
      ? [
          { label: c.onWhite, ratio: contrast(color, WHITE), bg: "#ffffff" },
          { label: c.onBlack, ratio: contrast(color, BLACK), bg: "#111111" },
          { label: `${c.onCustom} (${bgCustomHex})`, ratio: contrast(color, bgCustom), bg: bgCustomHex },
        ]
      : [],
  );

  function badge(ratio) {
    if (ratio >= 7) return { cls: "ok", label: "AAA" };
    if (ratio >= 4.5) return { cls: "ok", label: "AA" };
    if (ratio >= 3) return { cls: "warn", label: "AA-L" };
    return { cls: "bad", label: "✕" };
  }

  const hex6 = $derived(color ? describe({ ...color, a: 1 }).hex : "#000000");

  function rgbToCmyk(r, g, b) {
    if (r === 0 && g === 0 && b === 0) return "cmyk(0%, 0%, 0%, 100%)";
    const rr = 1 - r / 255, gg = 1 - g / 255, bb = 1 - b / 255;
    const k = Math.min(rr, gg, bb);
    const c = (rr - k) / (1 - k), m = (gg - k) / (1 - k), y = (bb - k) / (1 - k);
    return `cmyk(${Math.round(c * 100)}%, ${Math.round(m * 100)}%, ${Math.round(y * 100)}%, ${Math.round(k * 100)}%)`;
  }

  const cmyk = $derived(color ? rgbToCmyk(color.r, color.g, color.b) : "");
  const schemes = $derived(color ? harmonies({ ...color, a: 1 }) : []);
  const SCHEME_LABELS = $derived({ complementary: c.schemeComp, analogous: c.schemeAnalog, triadic: c.schemeTriad, split: c.schemeSplit, tetradic: c.schemeTetra, shades: c.schemeShades });
  let copiedHex = $state("");
  let copyTimer;
  function copySwatch(hex) {
    copyText(hex);
    copiedHex = hex;
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => (copiedHex = ""), 1200);
  }
  const eyedropperSupported = $state(typeof window !== "undefined" && "EyeDropper" in window);

  async function pickFromScreen() {
    try {
      const result = await new window.EyeDropper().open();
      input = result.sRGBHex;
    } catch {
      // user cancelled — keep current input
    }
  }
  persistState("color", {
    get: () => ({ input, bgInput }),
    set: (v) => {
      input = v.input ?? input;
      bgInput = v.bgInput ?? bgInput;
    },
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <label class="dbx-label" for="col-in">{s.input}</label>
    <div class="row">
      <input id="col-in" class="dbx-input mono" bind:value={input} placeholder={c.placeholder} />
      <input type="color" class="picker" value={hex6}
        oninput={(e) => (input = e.target.value)} />
      {#if eyedropperSupported}
        <button type="button" class="dbx-btn" onclick={pickFromScreen} title={c.eyedropper}>⌖</button>
      {/if}
      {#if color}
        <span class="swatch" style="background:{info.rgb}"></span>
      {/if}
    </div>
    {#if invalid}<p class="err">{c.invalid}</p>{/if}
  </div>

  {#if info}
    <div class="dbx-card table-card">
      <table class="dbx-table">
        <tbody>
          <tr><td class="k">HEX</td><td class="v"><code>{info.hex}</code></td><td class="act"><CopyButton text={info.hex} small /></td></tr>
          <tr><td class="k">RGB</td><td class="v"><code>{info.rgb}</code></td><td class="act"><CopyButton text={info.rgb} small /></td></tr>
          <tr><td class="k">HSL</td><td class="v"><code>{info.hsl}</code></td><td class="act"><CopyButton text={info.hsl} small /></td></tr>
          <tr><td class="k">HSV</td><td class="v"><code>{info.hsv}</code></td><td class="act"><CopyButton text={info.hsv} small /></td></tr>
          <tr><td class="k">CMYK</td><td class="v"><code>{cmyk}</code></td><td class="act"><CopyButton text={cmyk} small /></td></tr>
        </tbody>
      </table>
    </div>

    <div class="dbx-card table-card">
      <h2 class="dbx-section-title">{c.contrast}</h2>
      <div class="row">
        <label class="dbx-label" for="col-bg" style="margin:0">{c.background}</label>
        <input id="col-bg" class="dbx-input mono" bind:value={bgInput} placeholder="#ffffff" />
        <input type="color" class="picker" value={bgCustomHex}
          oninput={(e) => (bgInput = e.target.value)} />
      </div>
      <table class="dbx-table">
        <tbody>
          {#each contrasts as ct}
            <tr>
              <td class="k">{ct.label}</td>
              <td><span class="chip" style="background:{ct.bg};color:{hex6};border:1px solid var(--color-border,#e2e8f0)">Aa</span> {ct.ratio.toFixed(2)}:1</td>
              <td class="act"><span class="badge {badge(ct.ratio).cls}">{badge(ct.ratio).label}</span></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="dbx-card table-card">
      <h2 class="dbx-section-title">{c.palette}</h2>
      {#each schemes as scheme}
        <div class="scheme">
          <span class="scheme-name">{SCHEME_LABELS[scheme.key]}</span>
          <div class="swatches">
            {#each scheme.colors as col}
              {@const hex = toHex(col)}
              <button
                type="button"
                class="pal"
                style="background:{hex};color:{luminance(col) > 0.35 ? 'rgba(0,0,0,.72)' : 'rgba(255,255,255,.92)'}"
                onclick={() => copySwatch(hex)}
                title={copiedHex === hex ? s.copied : hex}
              >
                <span class="hex">{copiedHex === hex ? s.copied : hex}</span>
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</ToolShell>

<style>
  .dbx-card { display: flex; flex-direction: column; gap: 10px; }
  .table-card { margin-top: 16px; }
  .row { display: flex; gap: 10px; align-items: center; }
  .row .dbx-input { flex: 1; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .picker { width: 40px; height: 32px; padding: 0; border: 1px solid var(--color-border, #e2e8f0); border-radius: 6px; background: transparent; cursor: pointer; }
  .swatch { width: 32px; height: 32px; border-radius: 6px; border: 1px solid var(--color-border, #e2e8f0); flex: none; }
  .k { white-space: nowrap; font-weight: 600; width: 90px; }
  .v code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; }
  .act { width: 70px; text-align: right; }
  .chip { display: inline-block; padding: 1px 8px; border-radius: 4px; font-weight: 600; font-size: 12px; margin-right: 8px; }
  .badge { display: inline-flex; align-items: center; height: 20px; padding: 0 8px; border-radius: 999px; font-size: 11px; font-weight: 500; }
  .badge.ok { background: rgba(22, 163, 74, .15); color: #16a34a; }
  .badge.warn { background: rgba(217, 119, 6, .15); color: #d97706; }
  .badge.bad { background: rgba(220, 38, 38, .15); color: var(--color-destructive, #dc2626); }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; margin: 0; }
  .scheme { display: flex; align-items: center; gap: 12px; }
  .scheme-name { width: 130px; flex: none; font-size: 12px; font-weight: 600; color: var(--color-muted-foreground, #64748b); }
  .swatches { display: flex; flex: 1; border-radius: 8px; overflow: hidden; border: 1px solid var(--color-border, #e2e8f0); }
  .pal { flex: 1; height: 44px; border: none; cursor: pointer; display: flex; align-items: flex-end; justify-content: center; padding: 0 0 4px; }
  .pal .hex { font-size: 10px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; opacity: .85; }
</style>
