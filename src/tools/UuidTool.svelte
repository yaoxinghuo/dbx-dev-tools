<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { generateIds, uuidNamed, isUuid, UUID_NAMESPACES, ID_TYPES } from "../lib/ids.js";
  import { t, onLangChange } from "../lib/i18n.js";
  import { persistState } from "../lib/persist.svelte.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.uuid);
  const u = $derived(s.uuid);

  let type = $state("uuid");
  let count = $state(5);
  let uppercase = $state(false);
  let hyphens = $state(true);
  let ids = $state([]);
  // Name-based UUID (v3/v5): deterministic, so a single output, not a batch.
  let nsChoice = $state("dns");
  let nsCustom = $state("");
  let nameInput = $state("");
  let error = $state("");

  const TYPE_LABELS = { uuid: "UUID v4", uuidv5: "UUID v5", uuidv3: "UUID v3", nanoid: "NanoID", ulid: "ULID" };
  const named = $derived(type === "uuidv5" || type === "uuidv3");

  async function generate() {
    error = "";
    if (named) {
      if (!nameInput.trim()) {
        ids = [];
        return;
      }
      const ns = nsChoice === "custom" ? nsCustom.trim() : UUID_NAMESPACES[nsChoice];
      if (!isUuid(ns)) {
        ids = [];
        error = u.invalidNs;
        return;
      }
      const id = await uuidNamed(type === "uuidv5" ? 5 : 3, ns, nameInput.trim());
      ids = id ? [format(id)] : [];
      return;
    }
    const n = Math.min(Math.max(1, count | 0), 500);
    ids = generateIds(type, n).map(format);
  }

  // hyphens/uppercase only apply to UUID — NanoID casing is meaningful,
  // ULID is uppercase by spec.
  function format(id) {
    if (!type.startsWith("uuid")) return id;
    let v = hyphens ? id : id.replaceAll("-", "");
    return uppercase ? v.toUpperCase() : v;
  }

  $effect(generate);
  persistState("uuid", {
    get: () => ({ type, nsChoice, nsCustom, nameInput }),
    set: (v) => {
      type = v.type ?? type;
      nsChoice = v.nsChoice ?? nsChoice;
      nsCustom = v.nsCustom ?? nsCustom;
      nameInput = v.nameInput ?? nameInput;
    },
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card controls">
    <div class="seg">
      {#each ID_TYPES as ty}
        <button type="button" class="seg-btn" class:active={type === ty} onclick={() => (type = ty)}>{TYPE_LABELS[ty]}</button>
      {/each}
    </div>
    {#if named}
      <label>
        <span class="dbx-label">{u.namespace}</span>
        <select class="dbx-input narrow" bind:value={nsChoice}>
          <option value="dns">DNS</option>
          <option value="url">URL</option>
          <option value="oid">OID</option>
          <option value="x500">X.500</option>
          <option value="custom">{u.customNs}</option>
        </select>
      </label>
      {#if nsChoice === "custom"}
        <input class="dbx-input mono ns" bind:value={nsCustom} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
      {/if}
      <input class="dbx-input mono name" bind:value={nameInput} placeholder={u.namePlaceholder} />
    {:else}
      <label>
        <span class="dbx-label">{u.count}</span>
        <input name="count" class="dbx-input narrow" type="number" min="1" max="500" bind:value={count} />
      </label>
    {/if}
    {#if type.startsWith("uuid")}
      <label class="check"><input type="checkbox" bind:checked={uppercase} /> {u.uppercase}</label>
      <label class="check"><input type="checkbox" bind:checked={hyphens} /> {u.hyphens}</label>
    {/if}
    {#if !named}
      <div class="actions">
        <button type="button" class="dbx-btn dbx-btn--primary" onclick={generate}>{s.regenerate}</button>
        <CopyButton text={ids.join("\n")} />
      </div>
    {/if}
  </div>
  {#if error}<p class="err">{error}</p>{/if}

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
  .ns { width: 280px; }
  .name { width: 200px; }
  .actions { display: flex; gap: 8px; margin-left: auto; }
  .list { display: flex; flex-direction: column; gap: 8px; }
  .row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 12px; }
  .row code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; }
  .seg { display: flex; border: 1px solid var(--color-border, #e2e8f0); border-radius: 8px; overflow: hidden; }
  .seg-btn { padding: 6px 14px; font-size: 13px; background: transparent; border: none; color: var(--color-text-secondary, #64748b); cursor: pointer; }
  .seg-btn.active { background: var(--color-primary, #3b82f6); color: #fff; }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; margin: 0 0 10px; }
</style>
