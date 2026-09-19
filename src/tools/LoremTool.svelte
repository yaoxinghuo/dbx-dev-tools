<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { t, onLangChange } from "../lib/i18n.js";
  import { generate } from "../lib/lorem.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.lorem);
  const u = $derived(s.lorem);

  let length = $state(255);
  let unit = $state("chars");
  let mode = $state("lorem");
  let pattern = $state("0123456789");
  let result = $state(null);

  const MODES = ["lorem", "pattern", "alpha", "cjk"];
  const PRESETS = [255, 256, 500, 1000, 5000, 65535];

  $effect(() => {
    result = generate({ length, unit, mode, pattern });
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <div class="opts">
      <label class="field">
        <span>{u.length}</span>
        <input class="dbx-input mono num" type="number" min="1" max="1000000" bind:value={length} />
      </label>
      <select class="dbx-select" bind:value={unit}>
        <option value="chars">{u.unitChars}</option>
        <option value="bytes">{u.unitBytes}</option>
      </select>
      <select class="dbx-select" bind:value={mode}>
        {#each MODES as m}
          <option value={m}>{u.modes[m]}</option>
        {/each}
      </select>
      {#if mode === "pattern"}
        <input class="dbx-input mono pat" bind:value={pattern} placeholder={u.patternPlaceholder} />
      {/if}
    </div>
    <div class="presets">
      {#each PRESETS as p}
        <button type="button" class="chip dbx-btn" onclick={() => (length = p)}>{p}</button>
      {/each}
    </div>
  </div>

  {#if result && result.text}
    <div class="dbx-card">
      <div class="card-head">
        <h2 class="dbx-section-title">{u.result} — {result.chars} {u.charsLabel} · {result.bytes} {u.bytesLabel}</h2>
        <CopyButton text={result.text} small />
      </div>
      <textarea class="dbx-textarea mono" rows="8" readonly value={result.text}></textarea>
      {#if unit === "bytes" && result.text.endsWith("x")}
        <p class="dbx-hint">{u.padHint}</p>
      {/if}
    </div>
  {/if}
</ToolShell>

<style>
  .dbx-card { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
  .card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .opts { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .field { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; }
  .num { width: 110px; }
  .pat { width: 160px; }
  .presets { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { height: 24px; padding: 0 10px; font-size: 12px; border-radius: 12px; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
  .dbx-hint { margin: 0; }
</style>
