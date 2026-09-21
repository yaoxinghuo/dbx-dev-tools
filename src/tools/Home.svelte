<script>
  import ToolShell from "../components/ToolShell.svelte";
  import GripIcon from "../components/GripIcon.svelte";
  import Icon from "../components/Icon.svelte";
  import { TOOLS, CATEGORY_TAGS, VISIBLE_TAGS } from "../lib/tools.js";
  import { buildSearchIndex } from "../lib/toolsearch.js";
  import { isFavorite, toggleFavorite, recentKeys, favoriteKeys, moveFavorite } from "../lib/prefs.svelte.js";
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

  // Category cards list only category-level tags (shared by 3+ tools), sorted
  // by tool count; the long tail of niche tags stays reachable through search.
  const categories = CATEGORY_TAGS;

  const visible = $derived.by(() => {
    const q = query.trim().toLowerCase();
    return TOOLS.filter((tool) => {
      if (activeTag && !tool.tags.includes(activeTag)) return false;
      if (q && !(searchIndex.get(tool.key) || "").includes(q)) return false;
      return true;
    });
  });

  // Favorites float to the top of the grid in the user's drag-sorted order.
  const favOrdered = $derived.by(() => {
    const order = new Map(favoriteKeys().map((key, i) => [key, i]));
    return visible
      .filter((tool) => order.has(tool.key))
      .sort((a, b) => order.get(a.key) - order.get(b.key));
  });
  const restOrdered = $derived(visible.filter((tool) => !isFavorite(tool.key)));
  const ordered = $derived([...favOrdered, ...restOrdered]);

  const recentTools = $derived.by(() =>
    recentKeys()
      .map((key) => TOOLS.find((tool) => tool.key === key))
      .filter(Boolean)
      .slice(0, 8)
  );

  // Favorite-card reordering only makes sense in the unfiltered grid — with a
  // search/category filter active, hidden favorites would shift invisibly.
  const canSort = $derived(!query.trim() && !activeTag);
  let dragKey = $state(null);
  let dropKey = $state(null);

  function favDragStart(e, tool) {
    dragKey = tool.key;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", tool.key);
    // The card itself is the drag source, so the browser's default drag
    // image already follows the cursor as a card ghost.
  }

  function favDragOver(e, tool) {
    if (!dragKey || dragKey === tool.key) return;
    e.preventDefault();
    dropKey = tool.key;
  }

  function favDrop(e, tool) {
    e.preventDefault();
    if (dragKey) moveFavorite(dragKey, tool.key);
    dragKey = null;
    dropKey = null;
  }
</script>

<ToolShell title={s.homeTitle} desc={s.homeSubtitle}>
  <div class="controls">
    <div class="searchwrap">
      <Icon name="search" size={15} />
      <input class="dbx-input search" bind:value={query} placeholder={s.home.searchPlaceholder} />
    </div>
  </div>

  {#if !query.trim() && !activeTag && recentTools.length}
    <div class="recent">
      <span class="recent-label dbx-hint"><Icon name="clock" size={12} />{s.home.recent}</span>
      {#each recentTools as tool}
        <button type="button" class="recent-chip dbx-btn" onclick={() => onPick?.(tool)}>{s.tools[tool.key].name}</button>
      {/each}
    </div>
  {/if}

  <div class="section dbx-hint">{s.home.browseCats}</div>
  <div class="cats">
    <button
      type="button"
      class="cat"
      class:on={activeTag === null}
      onclick={() => (activeTag = null)}
    ><span>{s.home.filterAll}</span><span class="cnt">{TOOLS.length}</span></button>
    {#each categories as cat}
      <button
        type="button"
        class="cat"
        class:on={activeTag === cat.key}
        onclick={() => (activeTag = activeTag === cat.key ? null : cat.key)}
      ><span>{tagName(cat.key)}</span><span class="cnt">{cat.count}</span></button>
    {/each}
  </div>

  {#snippet cell(tool)}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="cell"
      class:faved={canSort && isFavorite(tool.key)}
      class:drop={dropKey === tool.key}
      ondragover={(e) => canSort && isFavorite(tool.key) && favDragOver(e, tool)}
      ondrop={(e) => canSort && isFavorite(tool.key) && favDrop(e, tool)}
    >
      <button
        type="button"
        class="card dbx-card"
        draggable={canSort && isFavorite(tool.key) ? "true" : "false"}
        ondragstart={(e) => canSort && isFavorite(tool.key) && favDragStart(e, tool)}
        ondragend={() => { dragKey = null; dropKey = null; }}
        onclick={() => onPick?.(tool)}
      >
        <span class="name">{s.tools[tool.key].name}</span>
        <span class="desc dbx-hint">{s.tools[tool.key].desc}</span>
        <span class="tagrow">
          {#each tool.tags.filter((tag) => VISIBLE_TAGS.has(tag)) as tag}
            <span class="mini-tag">{tagName(tag)}</span>
          {/each}
        </span>
      </button>
      {#if canSort && isFavorite(tool.key)}
        <span class="gripbox" title={s.home.dragReorder}><GripIcon /></span>
      {/if}
      <button
        type="button"
        class="star"
        class:faved={isFavorite(tool.key)}
        title={isFavorite(tool.key) ? s.home.unfav : s.home.fav}
        onclick={() => toggleFavorite(tool.key)}
      ><Icon name="star" size={14} filled={isFavorite(tool.key)} /></button>
    </div>
  {/snippet}

  {#if visible.length}
    {#if canSort && favOrdered.length}
      <div class="section dbx-hint"><Icon name="star" size={12} filled />{s.home.favs}</div>
      <div class="grid">
        {#each favOrdered as tool}{@render cell(tool)}{/each}
      </div>
      <div class="section dbx-hint mid"><Icon name="grid" size={12} />{s.home.allTools}</div>
      <div class="grid">
        {#each restOrdered as tool}{@render cell(tool)}{/each}
      </div>
    {:else}
      <div class="grid">
        {#each ordered as tool}{@render cell(tool)}{/each}
      </div>
    {/if}
  {:else}
    <p class="dbx-hint empty">{s.home.noResults}</p>
  {/if}
</ToolShell>

<style>
  .controls { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
  .searchwrap { position: relative; max-width: 480px; }
  .searchwrap > :global(.ic) {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-muted-foreground);
    pointer-events: none;
  }
  .search { width: 100%; height: 40px; font-size: 14px; padding: 0 14px 0 34px; }
  .section { font-size: 12px; margin: 0 0 8px; display: flex; align-items: center; gap: 5px; }
  .section.mid { margin-top: 16px; }
  .cats { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; margin-bottom: 16px; }
  .cat {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 12px;
    font: inherit;
    font-size: 13px;
    text-align: left;
    color: inherit;
    background: var(--color-card);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    cursor: pointer;
  }
  .cat:hover { border-color: var(--color-primary); }
  .cat.on { border-color: var(--color-primary); background: var(--color-muted); }
  .cnt { font-size: 12px; color: var(--color-muted-foreground); }
  .recent { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 14px; }
  .recent-label { font-size: 12px; margin-right: 2px; display: inline-flex; align-items: center; gap: 5px; }
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
    cursor: pointer;
    color: var(--color-muted-foreground);
    padding: 2px;
    display: inline-flex;
  }
  .star:hover { color: var(--color-primary); }
  .star.faved { color: #f0b429; }
  .gripbox {
    position: absolute;
    top: 5px;
    left: 8px;
    padding: 3px 4px;
    cursor: grab;
    color: var(--color-input);
    line-height: 0;
    border-radius: 4px;
  }
  .cell:hover .gripbox { color: var(--color-muted-foreground); }
  .cell.drop .card { box-shadow: inset 3px 0 0 var(--color-primary); }
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
  .name { font-weight: 600; font-size: 14px; padding-right: 22px; }
  .cell.faved .name { padding-left: 20px; }
  .desc { flex: 1; }
  .tagrow { display: flex; flex-wrap: wrap; gap: 4px; }
  .mini-tag {
    font-size: 11px;
    padding: 1px 7px;
    border-radius: 9px;
    border: 1px solid var(--color-border);
    color: var(--color-muted-foreground);
  }
  .empty { font-size: 14px; }
</style>
