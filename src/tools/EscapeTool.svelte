<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { t, onLangChange } from "../lib/i18n.js";
  import { persistState } from "../lib/persist.svelte.js";
  import { ESCAPE_FORMATS } from "../lib/escape.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.escape);
  const u = $derived(s.escape);

  let input = $state("");
  let mode = $state("escape");
  let format = $state("html");
  let output = $state("");
  let error = $state("");

  const FORMAT_KEYS = ["html", "xml", "js", "regex", "csv", "shell"];

  $effect(() => {
    error = "";
    output = "";
    const text = input;
    if (!text) return;
    const f = ESCAPE_FORMATS[format];
    if (!f) {
      error = u.invalid;
      return;
    }
    try {
      output = mode === "escape" ? f.escape(text) : f.unescape(text);
    } catch {
      error = u.invalid;
    }
  });
  persistState("escape", {
    get: () => ({ input, mode, format }),
    set: (v) => {
      input = v.input ?? input;
      mode = v.mode ?? mode;
      format = v.format ?? format;
    },
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <div class="opts">
      <div class="seg">
        <button type="button" class="dbx-btn" class:dbx-btn--primary={mode === "escape"} onclick={() => (mode = "escape")}>{u.escape}</button>
        <button type="button" class="dbx-btn" class:dbx-btn--primary={mode === "unescape"} onclick={() => (mode = "unescape")}>{u.unescape}</button>
      </div>
      <select class="dbx-select" bind:value={format}>
        {#each FORMAT_KEYS as key}
          <option value={key}>{u.formats[key]}</option>
        {/each}
      </select>
    </div>
    <textarea class="dbx-textarea mono" rows="6" bind:value={input} placeholder={mode === "escape" ? u.escapePlaceholder : u.unescapePlaceholder}></textarea>
    {#if error}<p class="err">{error}</p>{/if}
    <p class="dbx-hint">{u.hints[format]}</p>
  </div>

  {#if output}
    <div class="dbx-card">
      <div class="card-head">
        <h2 class="dbx-section-title">{u.output}</h2>
        <CopyButton text={output} small />
      </div>
      <textarea class="dbx-textarea mono" rows="6" readonly value={output}></textarea>
    </div>
  {/if}
</ToolShell>

<style>
  .dbx-card { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
  .card-head { display: flex; align-items: center; justify-content: space-between; }
  .opts { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .seg { display: flex; gap: 0; }
  .seg .dbx-btn:first-child { border-radius: 6px 0 0 6px; }
  .seg .dbx-btn:last-child { border-radius: 0 6px 6px 0; margin-left: -1px; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; margin: 0; }
  .dbx-hint { margin: 0; }
</style>
