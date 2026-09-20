<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { t, onLangChange } from "../lib/i18n.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.regex);
  const r = $derived(s.regex);

  let pattern = $state("\\b[\\w.]+@[\\w-]+\\.[a-z]{2,}\\b");
  let text = $state("Contact foo@example.com or bar-baz@test.org for details.");
  let replacement = $state("[mail]");
  const flagList = ["g", "i", "m", "s", "u"];
  let flags = $state({ g: true, i: true, m: false, s: false, u: false });

  const flagStr = $derived(flagList.filter((f) => flags[f]).join(""));
  // matchAll needs /g — force it for the preview so users see every hit
  // regardless of the g checkbox (which still affects the reported flags).
  const compiled = $derived.by(() => {
    if (!pattern) return { re: null, error: null };
    try {
      const f = flagStr.includes("g") ? flagStr : flagStr + "g";
      return { re: new RegExp(pattern, f), error: null };
    } catch (e) {
      return { re: null, error: e.message };
    }
  });

  const MAX_MATCHES = 500;
  const matches = $derived.by(() => {
    if (!compiled.re || !text) return [];
    const out = [];
    for (const m of text.matchAll(compiled.re)) {
      out.push({ index: m.index, text: m[0], groups: m.slice(1) });
      if (out.length >= MAX_MATCHES) break;
    }
    return out;
  });

  // Segments for the highlighted preview (alternating plain/match text)
  const segments = $derived.by(() => {
    if (!compiled.re || !text || !matches.length) return [{ match: false, s: text }];
    const segs = [];
    let pos = 0;
    for (const m of matches) {
      if (m.index > pos) segs.push({ match: false, s: text.slice(pos, m.index) });
      segs.push({ match: true, s: m.text });
      pos = m.index + m.text.length;
    }
    if (pos < text.length) segs.push({ match: false, s: text.slice(pos) });
    return segs;
  });

  const replaced = $derived(compiled.re && text ? text.replace(compiled.re, replacement) : "");
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <label class="dbx-label" for="rx-pattern">{r.pattern}</label>
    <input id="rx-pattern" class="dbx-input mono" bind:value={pattern} placeholder="\d+" spellcheck="false" />
    <div class="flags">
      {#each flagList as f}
        <label class="check"><input type="checkbox" bind:checked={flags[f]} /> <code>/{f}</code> {r["flag_" + f]}</label>
      {/each}
    </div>
    {#if compiled.error}<p class="err">{r.invalid}: {compiled.error}</p>{/if}
  </div>

  <div class="dbx-card">
    <label class="dbx-label" for="rx-text">{r.text}</label>
    <textarea id="rx-text" class="dbx-input mono" rows="5" bind:value={text} spellcheck="false"></textarea>
  </div>

  {#if compiled.re && text}
    <div class="dbx-card">
      <h2 class="dbx-section-title">{r.preview}</h2>
      <pre class="preview mono">{#each segments as seg}{#if seg.match}<mark>{seg.s}</mark>{:else}{seg.s}{/if}{/each}</pre>
      <p class="meta">{matches.length}{matches.length >= MAX_MATCHES ? "+" : ""} {r.matches}</p>
    </div>

    {#if matches.length}
      <div class="dbx-card table-card">
        <table class="dbx-table">
          <thead><tr><th>#</th><th>{r.colMatch}</th><th>{r.colIndex}</th><th>{r.colGroups}</th></tr></thead>
          <tbody>
            {#each matches.slice(0, 100) as m, i}
              <tr>
                <td class="dim">{i + 1}</td>
                <td><code class="mono">{m.text}</code></td>
                <td class="dim">{m.index}</td>
                <td>{#each m.groups as g}<code class="grp mono">{g ?? "∅"}</code>{/each}{#if !m.groups.length}<span class="dim">—</span>{/if}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}

    <div class="dbx-card">
      <label class="dbx-label" for="rx-rep">{r.replace}</label>
      <input id="rx-rep" class="dbx-input mono" bind:value={replacement} placeholder="$1…" spellcheck="false" />
      {#if replaced !== text}
        <div class="rep-row">
          <pre class="preview mono">{replaced}</pre>
          <CopyButton text={replaced} small />
        </div>
      {/if}
    </div>
  {/if}
</ToolShell>

<style>
  .dbx-card { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
  .table-card { padding: 8px 12px; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .flags { display: flex; gap: 14px; flex-wrap: wrap; }
  .check { display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer; }
  .check code { color: var(--color-primary, #2563eb); font-weight: 600; }
  .preview { margin: 0; padding: 10px 12px; background: var(--color-surface-alt, #f8fafc); border: 1px solid var(--color-border, #e2e8f0); border-radius: 8px; white-space: pre-wrap; word-break: break-all; font-size: 13px; max-height: 200px; overflow: auto; }
  mark { background: rgba(245, 158, 11, .35); color: inherit; border-radius: 2px; padding: 0 1px; }
  .meta { margin: 0; font-size: 12px; color: var(--color-text-secondary, #64748b); }
  .grp { display: inline-block; margin-right: 6px; padding: 0 6px; background: var(--color-surface-alt, #f1f5f9); border: 1px solid var(--color-border, #e2e8f0); border-radius: 4px; font-size: 12px; }
  .dim { color: var(--color-text-secondary, #64748b); font-size: 12px; }
  .rep-row { display: flex; gap: 10px; align-items: flex-start; }
  .rep-row .preview { flex: 1; }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; margin: 0; word-break: break-all; }
</style>
