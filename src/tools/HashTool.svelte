<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { hashText } from "../lib/crypto.js";
  import { t, onLangChange } from "../lib/i18n.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.hash);
  const h = $derived(s.hash);

  let input = $state("");
  let uppercase = $state(false);
  let results = $state([]);

  let seq = 0;
  $effect(() => {
    const run = ++seq;
    if (!input) {
      results = [];
      return;
    }
    hashText(input).then((r) => {
      if (run === seq) results = r;
    });
  });

  const shown = $derived(results.map((r) => ({ ...r, hex: uppercase ? r.hex.toUpperCase() : r.hex })));
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <label class="dbx-label" for="hash-input">{s.input}</label>
    <textarea id="hash-input" class="dbx-textarea" rows="5" bind:value={input} placeholder={h.placeholder}></textarea>
    <label class="check"><input type="checkbox" bind:checked={uppercase} /> {h.uppercase}</label>
  </div>

  {#if shown.length}
    <div class="dbx-card table-card">
      <table class="dbx-table">
        <tbody>
          {#each shown as r}
            <tr>
              <td class="algo">{r.name}</td>
              <td class="digest"><code>{r.hex}</code></td>
              <td class="act"><CopyButton text={r.hex} small /></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</ToolShell>

<style>
  .dbx-card { display: flex; flex-direction: column; gap: 12px; }
  .check { display: flex; align-items: center; gap: 8px; font-size: 13px; }
  .table-card { margin-top: 18px; }
  .algo { white-space: nowrap; font-weight: 600; width: 90px; }
  .digest code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; overflow-wrap: anywhere; }
  .act { width: 60px; text-align: right; }
</style>
