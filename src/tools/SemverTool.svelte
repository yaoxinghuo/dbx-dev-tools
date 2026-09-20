<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { parseSemver, compareSemver, sortSemvers } from "../lib/semver.js";
  import { t, onLangChange } from "../lib/i18n.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.semver);
  const v = $derived(s.semver);

  let a = $state("1.2.3");
  let b = $state("1.10.0");
  let list = $state("2.0.0\n1.10.0\n1.2.3-beta\n1.2.3\n0.9.9");
  let desc = $state(false);
  let unique = $state(true);

  const cmp = $derived.by(() => {
    if (!a.trim() || !b.trim()) return null;
    const r = compareSemver(a, b);
    if (r === null) return { error: true };
    return { r, label: r < 0 ? "a<b" : r > 0 ? "a>b" : "a=b" };
  });

  const sorted = $derived(sortSemvers(list, { desc, unique }));
  const sortedText = $derived(sorted.valid.join("\n"));
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <h2 class="dbx-section-title">{v.cmpTitle}</h2>
    <div class="row">
      <input class="dbx-input mono" bind:value={a} placeholder="1.2.3" spellcheck="false" />
      <input class="dbx-input mono" bind:value={b} placeholder="1.10.0" spellcheck="false" />
    </div>
    {#if cmp}
      {#if cmp.error}
        <p class="err">{v.invalid}</p>
      {:else}
        <p class="result">
          <code class="mono">{a}</code>
          <span class="badge {cmp.r === 0 ? 'eq' : 'ne'}">{cmp.label}</span>
          <code class="mono">{b}</code>
          <span class="dim">({cmp.r === 0 ? v.equal : cmp.r < 0 ? v.less : v.greater})</span>
        </p>
      {/if}
    {/if}
  </div>

  <div class="dbx-card">
    <h2 class="dbx-section-title">{v.sortTitle}</h2>
    <textarea class="dbx-input mono" rows="6" bind:value={list} placeholder={"1.2.3\n2.0.0-rc.1\n1.10.0"} spellcheck="false"></textarea>
    <div class="opts">
      <label class="check"><input type="checkbox" bind:checked={desc} /> {v.descOrder}</label>
      <label class="check"><input type="checkbox" bind:checked={unique} /> {v.unique}</label>
      {#if sorted.valid.length}
        <CopyButton text={sortedText} small />
      {/if}
    </div>
    {#if sorted.valid.length}
      <pre class="preview mono">{sortedText}</pre>
    {/if}
    {#if sorted.invalid.length}
      <p class="warn">{v.invalidItems}: {#each sorted.invalid as iv}<code class="mono bad">{iv}</code>{/each}</p>
    {/if}
  </div>
</ToolShell>

<style>
  .dbx-card { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
  .row { display: flex; gap: 10px; }
  .row .dbx-input { flex: 1; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .opts { display: flex; gap: 16px; align-items: center; }
  .check { display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer; }
  .result { display: flex; align-items: center; gap: 10px; margin: 0; flex-wrap: wrap; }
  .badge { display: inline-flex; align-items: center; height: 20px; padding: 0 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
  .badge.eq { background: rgba(22, 163, 74, .15); color: #16a34a; }
  .badge.ne { background: rgba(37, 99, 235, .12); color: var(--color-primary, #2563eb); }
  .dim { color: var(--color-text-secondary, #64748b); font-size: 13px; }
  .preview { margin: 0; padding: 10px 12px; background: var(--color-surface-alt, #f8fafc); border: 1px solid var(--color-border, #e2e8f0); border-radius: 8px; font-size: 13px; max-height: 220px; overflow: auto; }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; margin: 0; }
  .warn { color: #d97706; font-size: 13px; margin: 0; }
  .bad { background: rgba(220, 38, 38, .1); border-radius: 4px; padding: 0 4px; margin-right: 6px; }
</style>
