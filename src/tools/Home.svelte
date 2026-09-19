<script>
  import ToolShell from "../components/ToolShell.svelte";
  import { TOOLS } from "../lib/tools.js";
  import { t, allMessages, onLangChange } from "../lib/i18n.js";

  let { onPick } = $props();
  let s = $state(t());
  onLangChange(() => (s = t()));

  let query = $state("");
  let activeTag = $state(null);

  function tagName(key) {
    return s.tags[key] || key;
  }

  // Search index spans every locale: a Chinese query must find a tool even
  // under an English UI, and vice versa. Built once per language change.
  const searchIndex = $derived.by(() => {
    const all = allMessages();
    const index = new Map();
    for (const tool of TOOLS) {
      const parts = [tool.key, tool.contributionId];
      for (const lang of Object.values(all)) {
        const meta = lang.tools[tool.key];
        if (meta) parts.push(meta.name, meta.desc);
        for (const tag of tool.tags) parts.push(lang.tags[tag] || tag);
      }
      index.set(tool.key, parts.join("\n").toLowerCase());
    }
    return index;
  });

  // Unique canonical tags across all tools, ordered by their display name in
  // the active language so the chip row reads naturally.
  const allTags = $derived.by(() => {
    const keys = new Set();
    for (const tool of TOOLS) for (const tag of tool.tags) keys.add(tag);
    return [...keys].sort((a, b) => tagName(a).localeCompare(tagName(b)));
  });

  const visible = $derived.by(() => {
    const q = query.trim().toLowerCase();
    return TOOLS.filter((tool) => {
      if (activeTag && !tool.tags.includes(activeTag)) return false;
      if (q && !(searchIndex.get(tool.key) || "").includes(q)) return false;
      return true;
    });
  });
</script>

<ToolShell title={s.homeTitle} desc={s.homeSubtitle}>
  <div class="controls">
    <input class="dbx-input search" bind:value={query} placeholder={s.home.searchPlaceholder} />
    <div class="chips">
      <button
        type="button"
        class="chip dbx-btn"
        class:dbx-btn--primary={activeTag === null}
        onclick={() => (activeTag = null)}
      >{s.home.filterAll}</button>
      {#each allTags as tag}
        <button
          type="button"
          class="chip dbx-btn"
          class:dbx-btn--primary={activeTag === tag}
          onclick={() => (activeTag = activeTag === tag ? null : tag)}
        >{tagName(tag)}</button>
      {/each}
    </div>
  </div>

  {#if visible.length}
    <div class="grid">
      {#each visible as tool}
        <button type="button" class="card dbx-card" onclick={() => onPick?.(tool)}>
          <span class="name">{s.tools[tool.key].name}</span>
          <span class="desc dbx-hint">{s.tools[tool.key].desc}</span>
          <span class="tagrow">
            {#each tool.tags as tag}
              <span class="mini-tag">{tagName(tag)}</span>
            {/each}
          </span>
          <span class="open dbx-link">{s.open} ›</span>
        </button>
      {/each}
    </div>
  {:else}
    <p class="dbx-hint empty">{s.home.noResults}</p>
  {/if}
</ToolShell>

<style>
  .controls { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
  .search { max-width: 420px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { height: 24px; padding: 0 10px; font-size: 12px; border-radius: 12px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
  .card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    text-align: left;
    font: inherit;
    color: inherit;
    cursor: pointer;
    transition: border-color .15s, transform .15s;
  }
  .card:hover {
    border-color: var(--color-primary);
    transform: translateY(-1px);
  }
  .name { font-weight: 600; font-size: 14px; }
  .desc { flex: 1; }
  .tagrow { display: flex; flex-wrap: wrap; gap: 4px; }
  .mini-tag {
    font-size: 11px;
    padding: 1px 7px;
    border-radius: 9px;
    border: 1px solid var(--color-border);
    color: var(--color-muted-foreground);
  }
  .open { font-size: 12px; }
  .empty { font-size: 14px; }
</style>
