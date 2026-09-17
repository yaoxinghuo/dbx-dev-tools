<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { t, onLangChange } from "../lib/i18n.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.uuid);
  const u = $derived(s.uuid);

  let count = $state(5);
  let uppercase = $state(false);
  let hyphens = $state(true);
  let uuids = $state([]);

  function generate() {
    const n = Math.min(Math.max(1, count | 0), 500);
    uuids = Array.from({ length: n }, () => format(crypto.randomUUID()));
  }

  function format(id) {
    let v = hyphens ? id : id.replaceAll("-", "");
    return uppercase ? v.toUpperCase() : v;
  }

  $effect(generate);
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card controls">
    <label>
      <span class="dbx-label">{u.count}</span>
      <input name="count" class="dbx-input narrow" type="number" min="1" max="500" bind:value={count} />
    </label>
    <label class="check"><input type="checkbox" bind:checked={uppercase} /> {u.uppercase}</label>
    <label class="check"><input type="checkbox" bind:checked={hyphens} /> {u.hyphens}</label>
    <div class="actions">
      <button type="button" class="dbx-btn dbx-btn--primary" onclick={generate}>{s.regenerate}</button>
      <CopyButton text={uuids.join("\n")} />
    </div>
  </div>

  <div class="list">
    {#each uuids as id}
      <div class="row dbx-card">
        <code>{id}</code>
        <CopyButton text={id} small />
      </div>
    {/each}
  </div>
</ToolShell>

<style>
  .controls { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; margin-bottom: 18px; }
  .controls > label { display: flex; align-items: center; gap: 8px; font-size: 13px; }
  .narrow { width: 90px; }
  .actions { display: flex; gap: 8px; margin-left: auto; }
  .list { display: flex; flex-direction: column; gap: 8px; }
  .row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 12px; }
  .row code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; }
</style>
