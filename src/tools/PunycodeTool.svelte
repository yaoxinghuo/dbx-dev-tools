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
  let input = $state("日本.jp");
  let output = $state("");
  let error = $state("");

  $effect(() => {
    error = "";
    output = "";
    if (!input.trim()) return;
    try {
      output = mode === "toAscii" ? domainToAscii(input.trim()) : domainToUnicode(input.trim());
    } catch {
      error = p.invalid;
    }
  });
  persistState("punycode", {
    get: () => ({ mode, input }),
    set: (v) => {
      mode = v.mode ?? mode;
      input = v.input ?? input;
    },
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card controls">
    <div class="modes">
      <label class="check"><input type="radio" bind:group={mode} value="toAscii" /> {p.toAscii}</label>
      <label class="check"><input type="radio" bind:group={mode} value="toUnicode" /> {p.toUnicode}</label>
    </div>
    <label class="dbx-label" for="pny-in">{s.input}</label>
    <input id="pny-in" class="dbx-input mono" bind:value={input} spellcheck="false"
      placeholder={mode === "toAscii" ? "日本.jp" : "xn--wgv71a.jp"} />
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
