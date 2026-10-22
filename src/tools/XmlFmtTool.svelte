<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { formatXml, validateXml } from "../lib/xmlfmt.js";
  import { highlightXml } from "../lib/markuphl.js";
  import { t, onLangChange } from "../lib/i18n.js";
  import { persistState } from "../lib/persist.svelte.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.xmlfmt);
  const u = $derived(s.xmlfmt);

  let indent = $state("2sp");
  let input = $state("");

  const INDENTS = { "2sp": "  ", "4sp": "    ", tab: "\t" };

  const result = $derived.by(() => {
    if (!input.trim()) return { text: "", html: "", error: "" };
    const err = validateXml(input);
    if (err) return { text: "", html: "", error: err };
    const text = formatXml(input, INDENTS[indent]);
    return { text, html: highlightXml(text), error: "" };
  });

  persistState("xmlfmt", {
    get: () => ({ indent, input }),
    set: (v) => {
      indent = v.indent ?? indent;
      input = v.input ?? input;
    },
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card controls">
    <label>
      <span class="dbx-label">{u.indent}</span>
      <select class="dbx-input" bind:value={indent}>
        <option value="2sp">2 {u.spaces}</option>
        <option value="4sp">4 {u.spaces}</option>
        <option value="tab">Tab</option>
      </select>
    </label>
  </div>

  <textarea class="dbx-textarea mono" rows="12" bind:value={input} placeholder={u.placeholder}></textarea>

  {#if result.error}
    <p class="err">{u.invalid}：{result.error}</p>
  {:else if result.text}
    <div class="outhead">
      <h2 class="dbx-section-title">{s.output}</h2>
      <CopyButton text={result.text} small />
    </div>
    <pre class="out mono dbx-card"><code>{@html result.html}</code></pre>
  {/if}
</ToolShell>

<style>
  .controls { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 14px; }
  .controls > label { display: flex; align-items: center; gap: 8px; font-size: 13px; white-space: nowrap; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; margin: 10px 0 0; }
  .outhead { display: flex; align-items: center; justify-content: space-between; margin: 16px 0 8px; }
  .out { margin: 0; padding: 12px 14px; overflow-x: auto; font-size: 13px; line-height: 1.55; white-space: pre; tab-size: 4; }
  .out :global(.nx-dir) { color: var(--color-primary, #3b82f6); }
  .out :global(.nx-str) { color: #16a34a; }
  .out :global(.nx-com) { color: var(--color-muted-foreground, #64748b); font-style: italic; }
  .out :global(.nx-var) { color: #9333ea; }
  .out :global(.nx-punc) { color: #94a3b8; }
</style>
