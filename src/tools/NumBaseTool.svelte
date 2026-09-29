<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { BASES, CUSTOM_ID, clampRadix, describeInteger, formatBaseInteger, parseBaseInteger } from "../lib/numbase.js";
  import { t, onLangChange } from "../lib/i18n.js";
  import { persistState } from "../lib/persist.svelte.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.numbase);
  const n = $derived(s.numbase);

  // One draft string per field; only the field being edited is "live", the
  // rest repaints from the parsed value (focus-draft pattern like ColorTool).
  let drafts = $state({});
  let value = $state(null); // BigInt | null
  let invalidId = $state("");
  let customRadix = $state(36);
  let grouped = $state(true);
  let prefixed = $state(false);

  const allIds = $derived([...BASES.map((b) => b.id), CUSTOM_ID]);
  const info = $derived(value !== null ? describeInteger(value) : null);

  function radixOf(id) {
    return id === CUSTOM_ID ? clampRadix(customRadix) : BASES.find((b) => b.id === id)?.radix;
  }

  function display(id) {
    if (drafts[id] !== undefined) return drafts[id];
    if (value === null) return "";
    const radix = radixOf(id);
    return radix ? formatBaseInteger(value, radix, { group: grouped, prefix: prefixed && id !== CUSTOM_ID }) : "";
  }

  function update(id, text) {
    drafts = { ...drafts, [id]: text };
    if (!text.trim()) {
      value = null;
      invalidId = "";
      drafts = { [id]: "" };
      return;
    }
    const v = parseBaseInteger(text, radixOf(id));
    if (v === null) {
      invalidId = id;
      value = null;
      return;
    }
    invalidId = "";
    value = v;
    drafts = { [id]: text };
  }

  function blur(id) {
    drafts = { ...drafts, [id]: undefined };
  }

  const NAMES = $derived({ dec: n.dec, hex: n.hex, oct: n.oct, bin: n.bin });
  persistState("numbase", {
    get: () => ({ value: value !== null ? value.toString() : null, customRadix, grouped, prefixed }),
    set: (v) => {
      customRadix = v.customRadix ?? customRadix;
      grouped = v.grouped ?? grouped;
      prefixed = v.prefixed ?? prefixed;
      if (v.value != null) value = BigInt(v.value);
    },
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <div class="info">
      <div class="item"><span class="lbl">{n.bits}</span><span class="val">{info ? `${info.bits} bit` : "—"}</span></div>
      <div class="item"><span class="lbl">{n.bytes}</span><span class="val">{info ? `${info.bytes} B` : "—"}</span></div>
      <div class="item"><span class="lbl">{n.char}</span><span class="val">{info?.glyph ? `'${info.glyph}'` : info?.ascii ? `"${info.ascii}"` : "—"}</span></div>
      <div class="item"><span class="lbl">Unicode</span><span class="val">{info?.code || "—"}</span></div>
    </div>
    <div class="opts">
      <label class="check"><input type="checkbox" bind:checked={grouped} /> {n.grouped}</label>
      <label class="check"><input type="checkbox" bind:checked={prefixed} /> {n.prefixed}</label>
    </div>

    {#each allIds as id}
      {@const radix = radixOf(id)}
      <div class="baserow">
        <label class="bname" for="nb-{id}">{NAMES[id] ?? n.anyBase}<span class="bshort">{id === CUSTOM_ID ? `×${customRadix || "?"}` : BASES.find((b) => b.id === id).short}</span></label>
        {#if id === CUSTOM_ID}
          <input class="dbx-input radix" inputmode="numeric" bind:value={customRadix} title={n.radixHint} />
        {/if}
        <input id="nb-{id}" class="dbx-input mono" class:bad={invalidId === id}
          value={display(id)} spellcheck="false"
          oninput={(e) => update(id, e.target.value)}
          onblur={() => blur(id)} />
        <CopyButton text={display(id)} small />
      </div>
    {/each}
    {#if invalidId}<p class="err">{n.invalid}</p>{/if}
  </div>
</ToolShell>

<style>
  .dbx-card { display: flex; flex-direction: column; gap: 12px; }
  .info { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border: 1px solid var(--color-border, #e2e8f0); border-radius: 8px; overflow: hidden; }
  .item { display: flex; flex-direction: column; gap: 2px; padding: 8px 12px; min-width: 0; }
  .item + .item { border-left: 1px solid var(--color-border, #e2e8f0); }
  .lbl { font-size: 11px; color: var(--color-muted-foreground, #64748b); }
  .val { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .opts { display: flex; gap: 16px; }
  .check { display: flex; align-items: center; gap: 6px; font-size: 13px; }
  .baserow { display: flex; align-items: center; gap: 8px; }
  .bname { width: 110px; flex: none; font-size: 13px; font-weight: 600; display: flex; align-items: baseline; gap: 6px; }
  .bshort { font-size: 11px; font-weight: 400; color: var(--color-muted-foreground, #64748b); }
  .radix { width: 56px; flex: none; text-align: center; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; flex: 1; min-width: 0; }
  .bad { border-color: var(--color-destructive, #dc2626); }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; margin: 0; }
</style>
