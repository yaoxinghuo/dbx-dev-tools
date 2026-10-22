<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { formatNginx } from "../lib/nginxfmt.js";
  import { highlightNginx } from "../lib/nginxhl.js";
  import { t, onLangChange } from "../lib/i18n.js";
  import { persistState } from "../lib/persist.svelte.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.nginx);
  const u = $derived(s.nginx);

  let input = $state("");
  let indent = $state("4sp");
  let joinBrackets = $state(true);
  let align = $state(false);
  const INDENTS = { "2sp": "  ", "4sp": "    ", "8sp": "        ", tab: "\t" };
  const output = $derived(input.trim() ? formatNginx(input, { indentation: INDENTS[indent], joinBrackets, align }) : "");
  const html = $derived(highlightNginx(output));

  persistState("nginx", {
    get: () => ({ indent, joinBrackets, align, input }),
    set: (v) => {
      indent = v.indent ?? indent;
      joinBrackets = v.joinBrackets ?? joinBrackets;
      align = v.align ?? align;
      input = v.input ?? input;
    },
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card controls">
    <label>
      <span class="dbx-label">{u.indent}</span>
      <select class="dbx-input narrow" bind:value={indent}>
        <option value="2sp">2 {u.spaces}</option>
        <option value="4sp">4 {u.spaces}</option>
        <option value="8sp">8 {u.spaces}</option>
        <option value="tab">Tab</option>
      </select>
    </label>
    <label class="check"><input type="checkbox" bind:checked={joinBrackets} /> {u.joinBrackets}</label>
    <label class="check"><input type="checkbox" bind:checked={align} /> {u.align}</label>
  </div>

  <textarea class="dbx-textarea mono" rows="12" bind:value={input} placeholder={u.placeholder}></textarea>

  {#if output}
    <div class="outhead">
      <h2 class="dbx-section-title">{s.output}</h2>
      <CopyButton text={output} small />
    </div>
    <pre class="out mono dbx-card"><code>{@html html}</code></pre>
  {/if}
</ToolShell>

<style>
  .controls { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 14px; }
  .controls > label { display: flex; align-items: center; gap: 8px; font-size: 13px; white-space: nowrap; }
  .narrow { width: auto; }
  .outhead { display: flex; align-items: center; justify-content: space-between; margin: 16px 0 8px; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .out { margin: 0; padding: 12px 14px; overflow-x: auto; font-size: 13px; line-height: 1.55; white-space: pre; tab-size: 4; }
  .out :global(.nx-dir) { color: var(--color-primary, #3b82f6); }
  .out :global(.nx-str) { color: #16a34a; }
  .out :global(.nx-com) { color: var(--color-muted-foreground, #64748b); font-style: italic; }
  .out :global(.nx-var) { color: #9333ea; }
  .out :global(.nx-punc) { color: #94a3b8; }
</style>
