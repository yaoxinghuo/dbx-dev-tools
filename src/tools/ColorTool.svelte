<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { parseColor, describe, contrast, harmonies, toHex, luminance, rgbToHsl, hslToRgb, rgbToHsv, hsvToRgb, rgbToCmyk, cmykToRgb } from "../lib/color.js";
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

  const hsl = $derived(color ? rgbToHsl(color) : { h: 0, s: 0, l: 0 });
  const hsv = $derived(color ? rgbToHsv(color) : { h: 0, s: 0, v: 0 });
  const cmyk = $derived(color ? rgbToCmyk(color) : { c: 0, m: 0, y: 0, k: 1 });
  const cmykStr = $derived(color ? `cmyk(${Math.round(cmyk.c * 100)}%, ${Math.round(cmyk.m * 100)}%, ${Math.round(cmyk.y * 100)}%, ${Math.round(cmyk.k * 100)}%)` : "");

  // Grey/black colors carry no hue — remember the last real hue so the wheel
  // dot and V-slider don't snap back to red at S=0 or V=0.
  let hueKeep = $state(0);
  $effect(() => { if (hsv.s > 0 && hsv.v > 0) hueKeep = hsv.h; });
  const wheelH = $derived(hsv.s > 0 && hsv.v > 0 ? hsv.h : hueKeep);
  const discDot = $derived({
    x: 50 + Math.cos((wheelH * Math.PI) / 180) * hsv.s * 50,
    y: 50 + Math.sin((wheelH * Math.PI) / 180) * hsv.s * 50,
  });
  const vTopHex = $derived(toHex({ ...hsvToRgb(wheelH, hsv.s, 1), a: 1 }));

  function setColor(rgb) {
    input = toHex({ r: rgb.r, g: rgb.g, b: rgb.b, a: color?.a ?? 1 });
  }
  const setHsv = (hh, ss, vv) => setColor(hsvToRgb(hh, ss, vv));
  const setHsl = (hh, ss, ll) => setColor(hslToRgb(hh, ss, ll));
  const setCmyk = (o) => setColor(cmykToRgb(o));

  let dragDisc = $state(false);
  function discSet(e) {
    const r = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - r.left - r.width / 2;
    const dy = e.clientY - r.top - r.height / 2;
    const sat = Math.min(1, Math.hypot(dx, dy) / (r.width / 2));
    const h = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    // Touching the disc while V=0 would keep the color black forever — lift V
    // so the pick is visible.
    setHsv(h, sat, hsv.v === 0 ? 1 : hsv.v);
  }
  let dragV = $state(false);
  function vSet(e) {
    const r = e.currentTarget.getBoundingClientRect();
    setHsv(wheelH, hsv.s, Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height)));
  }

  // Numeric channel fields: draft text survives while focused so typing an
  // out-of-range value doesn't snap mid-edit; valid input applies clamped.
  let draft = $state({});
  function fieldIn(key, raw, apply, lo, hi) {
    draft = { ...draft, [key]: raw };
    const n = parseFloat(raw);
    if (raw.trim() !== "" && Number.isFinite(n)) apply(Math.min(hi, Math.max(lo, n)));
  }
  const onField = {
    r: (n) => setColor({ ...color, r: Math.round(n) }),
    g: (n) => setColor({ ...color, g: Math.round(n) }),
    b: (n) => setColor({ ...color, b: Math.round(n) }),
    lh: (n) => setHsl(n, hsl.s, hsl.l),
    ls: (n) => setHsl(hsl.h, n / 100, hsl.l),
    ll: (n) => setHsl(hsl.h, hsl.s, n / 100),
    vh: (n) => setHsv(n, hsv.s, hsv.v),
    vs: (n) => setHsv(hsv.h, n / 100, hsv.v),
    vv: (n) => setHsv(hsv.h, hsv.s, n / 100),
    cc: (n) => setCmyk({ ...cmyk, c: n / 100 }),
    cm: (n) => setCmyk({ ...cmyk, m: n / 100 }),
    cy: (n) => setCmyk({ ...cmyk, y: n / 100 }),
    ck: (n) => setCmyk({ ...cmyk, k: n / 100 }),
  };
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

{#snippet numField(key, label, val, lo, hi)}
  <div class="fld">
    <label for="col-{key}">{label}</label>
    <input id="col-{key}" class="dbx-input fldin" inputmode="decimal"
      value={draft[key] ?? Math.round(val)}
      onfocus={(e) => (draft = { ...draft, [key]: e.target.value })}
      oninput={(e) => fieldIn(key, e.target.value, onField[key], lo, hi)}
      onblur={() => (draft = { ...draft, [key]: undefined })} />
  </div>
{/snippet}

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="cols">
    <div class="fmt-col">
      <div class="dbx-card">
        <div class="card-head">
          <label class="dbx-label" for="col-in" style="margin:0">HEX</label>
          {#if info}<CopyButton text={info.hex} small />{/if}
        </div>
        <div class="row">
          <input id="col-in" class="dbx-input mono" bind:value={input} placeholder={c.placeholder} />
          <input type="color" class="picker" value={hex6}
            oninput={(e) => (input = e.target.value)} />
          {#if eyedropperSupported}
            <button type="button" class="dbx-btn" onclick={pickFromScreen} title={c.eyedropper}>⌖</button>
          {/if}
        </div>
        {#if invalid}<p class="err">{c.invalid}</p>{/if}
      </div>

      {#if info && color}
        <div class="dbx-card">
          <div class="card-head"><span class="fmt-name">RGB</span><CopyButton text={info.rgb} small /></div>
          <div class="fmt-grid">
            {@render numField("r", "R", color.r, 0, 255)}
            {@render numField("g", "G", color.g, 0, 255)}
            {@render numField("b", "B", color.b, 0, 255)}
          </div>
          <span class="hint">{c.range255}</span>
        </div>

        <div class="dbx-card">
          <div class="card-head"><span class="fmt-name">HSL</span><CopyButton text={info.hsl} small /></div>
          <div class="fmt-grid">
            {@render numField("lh", "H", hsl.h, 0, 360)}
            {@render numField("ls", "S", hsl.s * 100, 0, 100)}
            {@render numField("ll", "L", hsl.l * 100, 0, 100)}
          </div>
          <span class="hint">{c.rangeHsl}</span>
        </div>

        <div class="dbx-card">
          <div class="card-head"><span class="fmt-name">HSV</span><CopyButton text={info.hsv} small /></div>
          <div class="fmt-grid">
            {@render numField("vh", "H", hsv.h, 0, 360)}
            {@render numField("vs", "S", hsv.s * 100, 0, 100)}
            {@render numField("vv", "V", hsv.v * 100, 0, 100)}
          </div>
          <span class="hint">{c.rangeHsv}</span>
        </div>

        <div class="dbx-card">
          <div class="card-head"><span class="fmt-name">CMYK</span><CopyButton text={cmykStr} small /></div>
          <div class="fmt-grid">
            {@render numField("cc", "C", cmyk.c * 100, 0, 100)}
            {@render numField("cm", "M", cmyk.m * 100, 0, 100)}
            {@render numField("cy", "Y", cmyk.y * 100, 0, 100)}
            {@render numField("ck", "K", cmyk.k * 100, 0, 100)}
          </div>
          <span class="hint">{c.range100}</span>
        </div>
      {/if}
    </div>

    {#if info}
      <div class="dbx-card wheel-card">
        <span class="fmt-name">{c.wheel}</span>
        <div class="wheel-wrap">
          <div class="disc"
            onpointerdown={(e) => { dragDisc = true; e.currentTarget.setPointerCapture(e.pointerId); discSet(e); }}
            onpointermove={(e) => dragDisc && discSet(e)}
            onlostpointercapture={() => (dragDisc = false)}>
            <div class="disc-bg" style:filter="brightness({hsv.v})"></div>
            <span class="dot" style:left="{discDot.x}%" style:top="{discDot.y}%" style:background={hex6}></span>
          </div>
          <div class="vbar"
            onpointerdown={(e) => { dragV = true; e.currentTarget.setPointerCapture(e.pointerId); vSet(e); }}
            onpointermove={(e) => dragV && vSet(e)}
            onlostpointercapture={() => (dragV = false)}>
            <div class="vbar-bg" style:background="linear-gradient({vTopHex}, #000)"></div>
            <span class="dot" style:top="{(1 - hsv.v) * 100}%" style:background={hex6}></span>
          </div>
        </div>
        <span class="hint">{c.brightness} {Math.round(hsv.v * 100)}%</span>
        <div class="bigswatch" style:background={hex6}></div>
        <table class="dbx-table">
          <tbody>
            <tr><td class="k">HEX</td><td class="v"><code>{info.hex}</code></td><td class="act"><CopyButton text={info.hex} small /></td></tr>
            <tr><td class="k">RGB</td><td class="v"><code>{info.rgb}</code></td><td class="act"><CopyButton text={info.rgb} small /></td></tr>
            <tr><td class="k">HSL</td><td class="v"><code>{info.hsl}</code></td><td class="act"><CopyButton text={info.hsl} small /></td></tr>
            <tr><td class="k">HSV</td><td class="v"><code>{info.hsv}</code></td><td class="act"><CopyButton text={info.hsv} small /></td></tr>
            <tr><td class="k">CMYK</td><td class="v"><code>{cmykStr}</code></td><td class="act"><CopyButton text={cmykStr} small /></td></tr>
          </tbody>
        </table>
      </div>
    {/if}
  </div>

  {#if info}

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
  .cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 320px); gap: 16px; align-items: start; }
  @media (max-width: 880px) { .cols { grid-template-columns: 1fr; } }
  .fmt-col { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
  .card-head { display: flex; align-items: center; justify-content: space-between; }
  .fmt-name { font-size: 13px; font-weight: 600; }
  .fmt-grid { display: flex; gap: 8px; }
  .fld { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
  .fld label { font-size: 11px; font-weight: 600; color: var(--color-muted-foreground, #64748b); }
  .fldin { width: 100%; text-align: center; padding: 5px 4px; }
  .hint { font-size: 11px; color: var(--color-muted-foreground, #64748b); }
  .wheel-card { position: sticky; top: 0; }
  .wheel-wrap { display: flex; gap: 14px; justify-content: center; }
  /* Hue = conic ring; saturation = white center fading out; V = brightness filter
     on the bg layer only, so the pick dot stays visible at V=0. */
  .disc { position: relative; width: 190px; height: 190px; flex: none; border-radius: 50%; cursor: crosshair; touch-action: none; }
  .disc-bg { position: absolute; inset: 0; border-radius: 50%;
    background: radial-gradient(closest-side, #fff, rgba(255, 255, 255, 0)),
      conic-gradient(from 90deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00); }
  .vbar { position: relative; width: 14px; flex: none; border-radius: 7px; cursor: pointer; touch-action: none; }
  .vbar-bg { position: absolute; inset: 0; border-radius: 7px; border: 1px solid var(--color-border, #e2e8f0); }
  .dot { position: absolute; width: 14px; height: 14px; border-radius: 50%; border: 2px solid #fff;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, .4); transform: translate(-50%, -50%); pointer-events: none; box-sizing: border-box; }
  .vbar .dot { left: 50%; }
  .bigswatch { height: 34px; border-radius: 8px; border: 1px solid var(--color-border, #e2e8f0); }
  .row { display: flex; gap: 10px; align-items: center; }
  .row .dbx-input { flex: 1; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .picker { width: 40px; height: 32px; padding: 0; border: 1px solid var(--color-border, #e2e8f0); border-radius: 6px; background: transparent; cursor: pointer; flex: none; }
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
