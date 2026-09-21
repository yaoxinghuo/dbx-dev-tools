<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { generatePassword, entropyBits } from "../lib/crypto.js";
  import { t, onLangChange } from "../lib/i18n.js";
  import { persistState } from "../lib/persist.svelte.js";

  const LOWER = "abcdefghijklmnopqrstuvwxyz";
  const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const DIGITS = "0123456789";
  const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.<>?/";
  const AMBIGUOUS = /[Il1O0]/g;

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.password);
  const p = $derived(s.password);

  let length = $state(20);
  let count = $state(5);
  let useLower = $state(true);
  let useUpper = $state(true);
  let useDigits = $state(true);
  let useSymbols = $state(true);
  let customSymbols = $state(SYMBOLS);
  let noAmbiguous = $state(false);
  let passwords = $state([]);
  let error = $state("");

  const charset = $derived.by(() => {
    let set = "";
    if (useLower) set += LOWER;
    if (useUpper) set += UPPER;
    if (useDigits) set += DIGITS;
    if (useSymbols) set += customSymbols;
    if (noAmbiguous) set = set.replace(AMBIGUOUS, "");
    return [...new Set(set)].join("");
  });
  const bits = $derived(entropyBits(charset.length, length));
  const strength = $derived(bits < 50 ? "weak" : bits < 90 ? "medium" : "strong");

  function generate() {
    error = "";
    if (!charset.length) {
      error = p.pickCharset;
      passwords = [];
      return;
    }
    const n = Math.min(Math.max(1, count | 0), 100);
    passwords = Array.from({ length: n }, () => generatePassword(charset, length));
  }

  $effect(generate);
  // Options persist; generated passwords never do — they are secrets.
  persistState("password", {
    get: () => ({ length, count, useLower, useUpper, useDigits, useSymbols, customSymbols, noAmbiguous }),
    set: (v) => {
      length = v.length ?? length;
      count = v.count ?? count;
      useLower = v.useLower ?? useLower;
      useUpper = v.useUpper ?? useUpper;
      useDigits = v.useDigits ?? useDigits;
      useSymbols = v.useSymbols ?? useSymbols;
      customSymbols = v.customSymbols ?? customSymbols;
      noAmbiguous = v.noAmbiguous ?? noAmbiguous;
    },
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="grid">
    <div class="options dbx-card">
      <div class="row">
        <span class="dbx-label">{p.length}</span>
        <div class="len-row">
          <input type="range" min="4" max="128" bind:value={length} />
          <input class="dbx-input len-num" type="number" min="4" max="128" bind:value={length}
            onchange={() => (length = Math.min(128, Math.max(4, Math.round(length) || 4)))} />
        </div>
      </div>
      <label class="row">
        <span class="dbx-label">{p.count}</span>
        <input name="count" class="dbx-input narrow" type="number" min="1" max="100" bind:value={count} />
      </label>
      <label class="check"><input type="checkbox" bind:checked={useLower} /> {p.lowercase}</label>
      <label class="check"><input type="checkbox" bind:checked={useUpper} /> {p.uppercase}</label>
      <label class="check"><input type="checkbox" bind:checked={useDigits} /> {p.digits}</label>
      <label class="check"><input type="checkbox" bind:checked={useSymbols} /> {p.symbols}</label>
      {#if useSymbols}
        <input name="symbols" class="dbx-input" bind:value={customSymbols} placeholder={p.customSymbols} />
      {/if}
      <label class="check"><input type="checkbox" bind:checked={noAmbiguous} /> {p.excludeAmbiguous}</label>
      <div class="strength">
        <span class="dbx-label">{p.strength}: {bits} {p.bits}</span>
        <div class="meter"><div class="fill {strength}" style:width="{Math.min(bits, 160) / 1.6}%"></div></div>
      </div>
      <button type="button" class="dbx-btn dbx-btn--primary" onclick={generate}>{s.regenerate}</button>
    </div>

    <div class="results">
      {#if error}<p class="err">{error}</p>{/if}
      {#each passwords as pw}
        <div class="pw dbx-card">
          <code>{pw}</code>
          <CopyButton text={pw} small />
        </div>
      {/each}
      {#if passwords.length > 1}
        <CopyButton text={passwords.join("\n")} />
      {/if}
    </div>
  </div>
</ToolShell>

<style>
  .grid { display: grid; grid-template-columns: 280px 1fr; gap: 18px; align-items: start; }
  @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } }
  .options { display: flex; flex-direction: column; gap: 10px; }
  .row { display: flex; flex-direction: column; gap: 6px; }
  .len-row { display: flex; align-items: center; gap: 10px; }
  .len-row input[type="range"] { flex: 1; }
  .len-num { width: 64px; flex: none; }
  .narrow { width: 90px; }
  .check { display: flex; align-items: center; gap: 8px; font-size: 13px; }
  .strength { display: flex; flex-direction: column; gap: 6px; }
  .meter { height: 6px; border-radius: 3px; background: var(--color-muted, #eee); overflow: hidden; }
  .fill { height: 100%; border-radius: 3px; transition: width .2s; }
  .fill.weak { background: var(--color-destructive, #dc2626); }
  .fill.medium { background: #d97706; }
  .fill.strong { background: #16a34a; }
  .results { display: flex; flex-direction: column; gap: 8px; }
  .pw { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 12px; }
  .pw code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; overflow-wrap: anywhere; }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; }
</style>
