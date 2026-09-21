<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { saveFile } from "../lib/bridge.js";
  import { t, onLangChange } from "../lib/i18n.js";
  import { persistState } from "../lib/persist.svelte.js";
  import { formatJson, tokenizeJson } from "../lib/json.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.json);
  const u = $derived(s.json);

  let input = $state("");
  let indent = $state(2);
  let sortKeys = $state(false);
  let result = $state(null);

  const INDENTS = [
    { value: 2, label: "2 spaces" },
    { value: 4, label: "4 spaces" },
    { value: "tab", label: "Tab" },
    { value: "min", label: "Minify" },
  ];

  const tokens = $derived(result?.ok ? tokenizeJson(result.output) : []);

  // Multi-KB pastes re-run parse+stringify per keystroke; debounce a bit.
  $effect(() => {
    const text = input;
    const timer = setTimeout(() => {
      result = text.trim() ? formatJson(text, { indent, sortKeys }) : null;
    }, 150);
    return () => clearTimeout(timer);
  });

  function download() {
    if (!result?.ok) return;
    const ext = indent === "min" ? "min.json" : "json";
    saveFile({ fileName: `formatted.${ext}`, contentType: "application/json" }, new TextEncoder().encode(result.output));
  }
  persistState("json", {
    get: () => ({ input, indent, sortKeys }),
    set: (v) => {
      input = v.input ?? input;
      indent = v.indent ?? indent;
      sortKeys = v.sortKeys ?? sortKeys;
    },
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <div class="opts">
      <select class="dbx-select" bind:value={indent}>
        {#each INDENTS as o}
          <option value={o.value}>{u.indents[o.value]}</option>
        {/each}
      </select>
      <label class="check">
        <input type="checkbox" bind:checked={sortKeys} />
        <span>{u.sortKeys}</span>
      </label>
    </div>
    <textarea class="dbx-textarea mono" rows="9" bind:value={input} placeholder={u.placeholder}></textarea>
  </div>

  {#if result}
    {#if result.ok}
      <div class="dbx-card">
        <div class="card-head">
          <h2 class="dbx-section-title ok">{u.valid} — {u.depthLabel} {result.stats.depth} · {u.keysLabel} {result.stats.keys} · {u.itemsLabel} {result.stats.items}</h2>
          <div class="actions">
            <button type="button" class="dbx-btn small" onclick={download}>{u.download}</button>
            <CopyButton text={result.output} small />
          </div>
        </div>
        <pre class="hl mono">{#each tokens as tok}<span class={tok.t}>{tok.v}</span>{/each}</pre>
      </div>
    {:else}
      <div class="dbx-card">
        <h2 class="dbx-section-title err">{u.invalid}</h2>
        <table class="dbx-table">
          <tbody>
            <tr><td class="k">{u.position}</td><td class="v"><code>{u.lineLabel} {result.error.line}, {u.colLabel} {result.error.col}</code></td></tr>
            <tr><td class="k">{u.message}</td><td class="v"><code>{result.error.msg}</code></td></tr>
            <tr><td class="k">{u.context}</td><td class="v"><code class="snip">{result.error.snippet}</code></td></tr>
          </tbody>
        </table>
      </div>
    {/if}
  {/if}
</ToolShell>

<style>
  .dbx-card { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
  .card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
  .actions { display: flex; gap: 6px; }
  .opts { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .check { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
  .k { white-space: nowrap; font-weight: 600; width: 120px; }
  .v code { overflow-wrap: anywhere; }
  .snip { white-space: pre-wrap; }
  .ok { color: var(--color-primary); }
  .err { color: var(--color-destructive, #dc2626); }
  .hl {
    --tok-key: #0550ae;
    --tok-str: #0a6b33;
    --tok-num: #8250df;
    --tok-lit: #cf222e;
    --tok-punct: #57606a;
    margin: 0;
    padding: 6px 10px;
    border: 1px solid var(--color-input);
    border-radius: var(--radius-md);
    background: var(--color-background);
    max-height: 420px;
    overflow: auto;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  :global([data-dbx-theme="dark"]) .hl {
    --tok-key: #79b8ff;
    --tok-str: #7ee787;
    --tok-num: #d2a8ff;
    --tok-lit: #ff7b72;
    --tok-punct: #8b949e;
  }
  .hl .key { color: var(--tok-key); }
  .hl .str { color: var(--tok-str); }
  .hl .num { color: var(--tok-num); }
  .hl .lit { color: var(--tok-lit); }
  .hl .punct { color: var(--tok-punct); }
</style>
