<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { t, onLangChange } from "../lib/i18n.js";
  import { rmbUppercase } from "../lib/rmb.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.rmb);
  const r = $derived(s.rmb);

  let input = $state("");
  let result = $state("");
  let error = $state("");

  $effect(() => {
    error = "";
    result = "";
    const text = input.trim();
    if (!text) return;
    if (!/^-?\d+(\.\d+)?$/.test(text)) {
      error = r.invalid;
      return;
    }
    const upper = rmbUppercase(parseFloat(text));
    if (upper === null) error = r.invalid;
    else result = upper;
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <label class="dbx-label" for="rmb-in">{r.amount}</label>
    <input id="rmb-in" class="dbx-input mono" bind:value={input} placeholder={r.placeholder} inputmode="decimal" />
    {#if error}<p class="err">{error}</p>{/if}
  </div>
  {#if result}
    <div class="dbx-card">
      <div class="card-head">
        <h2 class="dbx-section-title">{r.result}</h2>
        <CopyButton text={result} small />
      </div>
      <p class="result">{result}</p>
    </div>
  {/if}
</ToolShell>

<style>
  .dbx-card { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
  .card-head { display: flex; align-items: center; justify-content: space-between; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .result { font-size: 20px; font-weight: 600; margin: 0; overflow-wrap: anywhere; letter-spacing: .02em; }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; margin: 0; }
</style>
