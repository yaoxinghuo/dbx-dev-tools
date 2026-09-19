<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { generateIds, ID_TYPES } from "../lib/ids.js";
  import { t, onLangChange } from "../lib/i18n.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.uuid);
  const u = $derived(s.uuid);

  let type = $state("uuid");
  let count = $state(5);
  let uppercase = $state(false);
  let hyphens = $state(true);
  let ids = $state([]);

  const TYPE_LABELS = { uuid: "UUID v4", nanoid: "NanoID", ulid: "ULID" };

  function generate() {
    const n = Math.min(Math.max(1, count | 0), 500);
    ids = generateIds(type, n).map(format);
  }

  // hyphens/uppercase only apply to UUID — NanoID casing is meaningful,
  // ULID is uppercase by spec.
  function format(id) {
    if (type !== "uuid") return id;
    let v = hyphens ? id : id.replaceAll("-", "");
    return uppercase ? v.toUpperCase() : v;
  }

  $effect(generate);
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card controls">
    <div class="seg">
      {#each ID_TYPES as ty}
        <button type="button" class="seg-btn" class:active={type === ty} onclick={() => (type = ty)}>{TYPE_LABELS[ty]}</button>
      {/each}
    </div>
    <label>
      <span class="dbx-label">{u.count}</span>
      <input name="count" class="dbx-input narrow" type="number" min="1" max="500" bind:value={count} />
    </label>
    {#if type === "uuid"}
      <label class="check"><input type="checkbox" bind:checked={uppercase} /> {u.uppercase}</label>
      <label class="check"><input type="checkbox" bind:checked={hyphens} /> {u.hyphens}</label>
    {/if}
    <div class="actions">
      <button type="button" class="dbx-btn dbx-btn--primary" onclick={generate}>{s.regenerate}</button>
      <CopyButton text={ids.join("\n")} />
    </div>
  </div>

  <div class="list">
    {#each ids as id}
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
  .seg { display: flex; border: 1px solid var(--color-border, #e2e8f0); border-radius: 8px; overflow: hidden; }
  .seg-btn { padding: 6px 14px; font-size: 13px; background: transparent; border: none; color: var(--color-text-secondary, #64748b); cursor: pointer; }
  .seg-btn.active { background: var(--color-primary, #3b82f6); color: #fff; }
</style>
