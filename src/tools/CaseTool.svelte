<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { convert } from "../lib/caseconv.js";
  import { t, onLangChange } from "../lib/i18n.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.case);
  const c = $derived(s.case);

  let input = $state("");

  const LABELS = {
    lower: "lower case", upper: "UPPER CASE", camel: "camelCase", pascal: "PascalCase",
    snake: "snake_case", kebab: "kebab-case", constant: "CONSTANT_CASE", title: "Title Case",
    sentence: "Sentence case", dot: "dot.case",
  };

  const results = $derived(convert(input));
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <label class="dbx-label" for="case-in">{s.input}</label>
    <input id="case-in" class="dbx-input mono" bind:value={input} placeholder={c.placeholder} />
  </div>

  {#if results.length}
    <div class="dbx-card table-card">
      <table class="dbx-table">
        <tbody>
          {#each results as r}
            <tr>
              <td class="k">{LABELS[r.key]}</td>
              <td class="v"><code>{r.value}</code></td>
              <td class="act"><CopyButton text={r.value} small /></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</ToolShell>

<style>
  .dbx-card { display: flex; flex-direction: column; gap: 10px; }
  .table-card { margin-top: 16px; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .k { white-space: nowrap; font-weight: 600; width: 130px; font-size: 12px; }
  .v code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; overflow-wrap: anywhere; }
  .act { width: 60px; text-align: right; }
</style>
