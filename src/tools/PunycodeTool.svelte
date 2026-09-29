<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { domainToAscii, domainToUnicode } from "../lib/punycode.js";
  import { t, onLangChange } from "../lib/i18n.js";
  import { persistState } from "../lib/persist.svelte.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.punycode);
  const p = $derived(s.punycode);

  let mode = $state("toAscii");
  // The two directions keep separate inputs — an internationalized domain
  // and its punycode form are different content, not one shared buffer.
  let encInput = $state("日本.jp");
  let decInput = $state("");
  let output = $state("");
  let error = $state("");

  // Round-trip convenience: after switching modes, an empty target input
  // gets seeded with the output just produced.
  function swapSeed(m) {
    if (!output) return;
    if (m === "toAscii" && !encInput) encInput = output;
    else if (m === "toUnicode" && !decInput) decInput = output;
  }

  $effect(() => {
    error = "";
    output = "";
    const text = mode === "toAscii" ? encInput : decInput;
    if (!text.trim()) return;
    try {
      output = mode === "toAscii" ? domainToAscii(text.trim()) : domainToUnicode(text.trim());
    } catch {
      error = p.invalid;
    }
  });
  persistState("punycode", {
    get: () => ({ mode, encInput, decInput }),
    set: (v) => {
      mode = v.mode ?? mode;
      encInput = v.encInput ?? encInput;
      decInput = v.decInput ?? decInput;
    },
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card controls">
    <div class="modes">
      <label class="check"><input type="radio" bind:group={mode} value="toAscii" onchange={() => swapSeed("toAscii")} /> {p.toAscii}</label>
      <label class="check"><input type="radio" bind:group={mode} value="toUnicode" onchange={() => swapSeed("toUnicode")} /> {p.toUnicode}</label>
    </div>
    <label class="dbx-label" for="pny-in">{s.input}</label>
    {#if mode === "toAscii"}
      <input id="pny-in" class="dbx-input mono" bind:value={encInput} spellcheck="false" placeholder="日本.jp" />
    {:else}
      <input id="pny-in" class="dbx-input mono" bind:value={decInput} spellcheck="false" placeholder="xn--wgv71a.jp" />
    {/if}
    {#if error}<p class="err">{error}</p>{/if}
    <div class="out-head">
      <label class="dbx-label" for="pny-out">{s.output}</label>
      <CopyButton text={output} small />
    </div>
    <input id="pny-out" class="dbx-input mono" readonly value={output} />
  </div>
</ToolShell>

<style>
  .controls { display: flex; flex-direction: column; gap: 12px; }
  .modes { display: flex; gap: 18px; align-items: center; }
  .check { display: flex; align-items: center; gap: 8px; font-size: 13px; }
  .out-head { display: flex; align-items: center; justify-content: space-between; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; margin: 0; }
</style>
