<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { processLines } from "../lib/lines.js";
  import { t, onLangChange } from "../lib/i18n.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.lines);
  const l = $derived(s.lines);

  let input = $state("");
  let trim = $state(false);
  let removeEmpty = $state(false);
  let dedupe = $state(false);
  let sort = $state("none");
  let reverse = $state(false);
  let number = $state(false);

  const output = $derived(processLines(input, { trim, removeEmpty, dedupe, sort, reverse, number }));
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <label class="dbx-label" for="lines-in">{s.input}</label>
    <textarea id="lines-in" class="dbx-textarea mono" rows="7" bind:value={input}></textarea>
    <div class="ops">
      <label class="check"><input type="checkbox" bind:checked={trim} /> {l.trim}</label>
      <label class="check"><input type="checkbox" bind:checked={removeEmpty} /> {l.removeEmpty}</label>
      <label class="check"><input type="checkbox" bind:checked={dedupe} /> {l.dedupe}</label>
      <label class="check"><input type="checkbox" bind:checked={reverse} /> {l.reverse}</label>
      <label class="check"><input type="checkbox" bind:checked={number} /> {l.number}</label>
      <select class="dbx-input narrow" bind:value={sort}>
        <option value="none">{l.sortNone}</option>
        <option value="asc">{l.sortAsc}</option>
        <option value="desc">{l.sortDesc}</option>
      </select>
    </div>
  </div>

  {#if input}
    <div class="dbx-card">
      <div class="card-head">
        <h2 class="dbx-section-title">{s.output}</h2>
        <CopyButton text={output} small />
      </div>
      <textarea class="dbx-textarea mono" rows="7" value={output} readonly></textarea>
    </div>
  {/if}
</ToolShell>

<style>
  .dbx-card { display: flex; flex-direction: column; gap: 12px; margin-bottom: 14px; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .ops { display: flex; gap: 14px; flex-wrap: wrap; align-items: center; }
  .check { display: flex; align-items: center; gap: 6px; font-size: 13px; }
  .narrow { width: 120px; }
  .card-head { display: flex; align-items: center; justify-content: space-between; }
</style>
