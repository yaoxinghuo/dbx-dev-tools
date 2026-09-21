<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { baseConvert } from "../lib/numbase.js";
  import { t, onLangChange } from "../lib/i18n.js";
  import { persistState } from "../lib/persist.svelte.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.numbase);
  const n = $derived(s.numbase);

  let input = $state("");

  const result = $derived(input.trim() ? baseConvert(input) : null);
  const invalid = $derived(input.trim() !== "" && result === null);

  const rows = $derived(
    result
      ? [
          { key: n.bin, value: result.bin },
          { key: n.oct, value: result.oct },
          { key: n.dec, value: result.dec },
          { key: n.hex, value: result.hex },
          ...(result.ascii !== null ? [{ key: "ASCII", value: result.ascii }] : []),
        ]
      : [],
  );
  persistState("numbase", {
    get: () => ({ input }),
    set: (v) => { input = v.input ?? input; },
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <label class="dbx-label" for="nb-in">{s.input}</label>
    <input id="nb-in" class="dbx-input mono" bind:value={input} placeholder={n.placeholder} />
    {#if invalid}<p class="err">{n.invalid}</p>{/if}
  </div>

  {#if rows.length}
    <div class="dbx-card table-card">
      <table class="dbx-table">
        <tbody>
          {#each rows as r}
            <tr>
              <td class="k">{r.key}</td>
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
  .k { white-space: nowrap; font-weight: 600; width: 110px; }
  .v code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; overflow-wrap: anywhere; }
  .act { width: 60px; text-align: right; }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; margin: 0; }
</style>
