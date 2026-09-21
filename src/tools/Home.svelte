<script>
  import ToolShell from "../components/ToolShell.svelte";
  import { TOOLS } from "../lib/tools.js";
  import { buildSearchIndex } from "../lib/toolsearch.js";
  import { isFavorite, toggleFavorite, recentKeys } from "../lib/prefs.svelte.js";
  import { t, onLangChange } from "../lib/i18n.js";

  let { onPick } = $props();
  let s = $state(t());
  onLangChange(() => (s = t()));

  let query = $state("");
  let activeTag = $state(null);

  function tagName(key) {
    return s.tags[key] || key;
  }

  // `s` is tracked so the index rebuilds when the UI language changes.
  const searchIndex = $derived.by(() => {
    s.home;
    return buildSearchIndex();
  });

  // Chips only list category-level tags (shared by 3+ tools); the long tail
  // of niche tags stays reachable through search, keeping the row to one line.
  const allTags = $derived.by(() => {
    const counts = new Map();
    for (const tool of TOOLS) for (const tag of tool.tags) counts.set(tag, (counts.get(tag) || 0) + 1);
    return [...counts.keys()].filter((key) => counts.get(key) >= 3).sort((a, b) => tagName(a).localeCompare(tagName(b)));
  });

  const visible = $derived.by(() => {
    const q = query.trim().toLowerCase();
    return TOOLS.filter((tool) => {
      if (activeTag && !tool.tags.includes(activeTag)) return false;
      if (q && !(searchIndex.get(tool.key) || "").includes(q)) return false;
      return true;
    });
  });

  // Favorites float to the top of the grid, declaration order preserved.
  const ordered = $derived.by(() => {
    const fav = [];
    const rest = [];
    for (const tool of visible) (isFavorite(tool.key) ? fav : rest).push(tool);
    return [...fav, ...rest];
  });

  const recentTools = $derived.by(() =>
    recentKeys()
      .map((key) => TOOLS.find((tool) => tool.key === key))
      .filter(Boolean)
      .slice(0, 8)
  );
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

  {#if !query.trim() && !activeTag && recentTools.length}
    <div class="recent">
      <span class="recent-label dbx-hint">{s.home.recent}</span>
      {#each recentTools as tool}
        <button type="button" class="recent-chip dbx-btn" onclick={() => onPick?.(tool)}>{s.tools[tool.key].name}</button>
      {/each}
    </div>
  {/if}

  {#if visible.length}
    <div class="grid">
      {#each ordered as tool}
        <div class="cell">
          <button type="button" class="card dbx-card" onclick={() => onPick?.(tool)}>
            <span class="name">{s.tools[tool.key].name}</span>
            <span class="desc dbx-hint">{s.tools[tool.key].desc}</span>
            <span class="open dbx-link">{s.open} ›</span>
          </button>
          <button
            type="button"
            class="star"
            class:faved={isFavorite(tool.key)}
            title={isFavorite(tool.key) ? s.home.unfav : s.home.fav}
            onclick={() => toggleFavorite(tool.key)}
          >{isFavorite(tool.key) ? "★" : "☆"}</button>
        </div>
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
  .recent { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 14px; }
  .recent-label { font-size: 12px; margin-right: 2px; }
  .recent-chip { height: 26px; padding: 0 12px; font-size: 12px; border-radius: 13px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
  .cell { position: relative; display: flex; }
  .cell .card { flex: 1; }
  .star {
    position: absolute;
    top: 6px;
    right: 8px;
    border: 0;
    background: none;
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    color: var(--color-muted-foreground);
    padding: 2px;
  }
  .star:hover { color: var(--color-primary); }
  .star.faved { color: #f0b429; }
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
  .open { font-size: 12px; }
  .empty { font-size: 14px; }
</style>
