<script>
  import ToolShell from "../components/ToolShell.svelte";
  import GripIcon from "../components/GripIcon.svelte";
  import Icon from "../components/Icon.svelte";
  import { TOOLS, CATEGORY_TAGS, VISIBLE_TAGS } from "../lib/tools.js";
  import { buildSearchIndex } from "../lib/toolsearch.js";
  import { isFavorite, toggleFavorite, recentKeys, favoriteKeys, clearRecent } from "../lib/prefs.svelte.js";
  import { favPointerDown, dnd } from "../lib/favdnd.svelte.js";
  import { t, onLangChange, allMessages } from "../lib/i18n.js";

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

  // Favorites are a pinned block in the user's drag-sorted order — always
  // shown in full, unaffected by the category/search filter below (which
  // only scopes the 全部工具 grid).
  const toolByKey = new Map(TOOLS.map((tool) => [tool.key, tool]));
  const favOrdered = $derived.by(() =>
    favoriteKeys()
      .map((key) => toolByKey.get(key))
      .filter(Boolean)
  );
  const restOrdered = $derived(visible.filter((tool) => !isFavorite(tool.key)));

  const recentTools = $derived.by(() =>
    recentKeys()
      .map((key) => TOOLS.find((tool) => tool.key === key))
      .filter(Boolean)
      .slice(0, 8)
  );

  // Favorite-card reordering only makes sense in the unfiltered grid — with a
  // search/category filter active, hidden favorites would shift invisibly.
  const canSort = $derived(!query.trim() && !activeTag);

  function favClick(tool) {
    // A pointer drag ends with a click on whatever card the pointer released
    // over — swallow it so a reorder doesn't also open a tool.
    if (dnd.moved) return;
    onPick?.(tool);
  }

  // Typewriter placeholder: erase the static hint once, then cycle through
  // representative tool names (they double as valid search queries). Pauses
  // while the input is focused; restarts on blur and on language switch.
  // Each tool contributes three phrases — its name in the UI language, in
  // English, and its primary tag — so the placeholder cycles 中文/EN/tag.
  const typeKeys = ["password", "qrcode", "json", "time", "color", "ipcalc"];
  const typeSamples = $derived.by(() => {
    const enTools = allMessages().en.tools;
    const out = [];
    for (const k of typeKeys) {
      const local = s.tools[k]?.name;
      const eng = enTools[k]?.name;
      const tag = toolByKey.get(k)?.tags[0];
      for (const v of [local, eng, tag && tagName(tag)]) {
        if (v && v !== out[out.length - 1]) out.push(v);
      }
    }
    return out;
  });
  let searchFocused = $state(false);
  let typed = $state("");
  let typing = $state(false);
  $effect(() => {
    const list = typeSamples;
    const base = s.home.searchPlaceholder;
    if (searchFocused || !list.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let chars = Array.from(base);
    let target = chars;
    let del = true;
    let li = 0;
    typing = true;
    let timer;
    const step = () => {
      if (del) {
        chars = chars.slice(0, -1);
        typed = chars.join("");
        if (!chars.length) {
          del = false;
          target = Array.from(list[li]);
          li = (li + 1) % list.length;
          timer = setTimeout(step, 500);
          return;
        }
        timer = setTimeout(step, 28);
        return;
      }
      chars = target.slice(0, chars.length + 1);
      typed = chars.join("");
      timer = setTimeout(step, chars.length >= target.length ? ((del = true), 1700) : 90);
    };
    timer = setTimeout(step, 1400);
    return () => { clearTimeout(timer); typing = false; };
  });

</script>

<ToolShell title={s.homeTitle} desc={s.homeSubtitle}>
  <div class="controls">
    <div class="searchwrap">
      <Icon name="search" size={15} />
      <input
        class="dbx-input search"
        class:has-clear={query}
        bind:value={query}
        placeholder={typing ? typed + "▏" : s.home.searchPlaceholder}
        onfocus={() => (searchFocused = true)}
        onblur={() => (searchFocused = false)}
      />
      {#if query}
        <button type="button" class="clearbtn" title={s.home.clear} onclick={() => (query = "")}>
          <Icon name="x" size={13} />
        </button>
      {/if}
    </div>
  </div>

  {#if recentTools.length}
    <div class="recent">
      <span class="recent-label dbx-hint">
        <Icon name="clock" size={12} />{s.home.recent}
        <button type="button" class="miniact" title={s.home.clearRecent} onclick={clearRecent}>
          <Icon name="trash" size={12} />
        </button>
      </span>
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
      class:dragging={dnd.key === tool.key}
      data-favkey={tool.key}
    >
      <button
        type="button"
        class="card dbx-card"
        onpointerdown={(e) => canSort && isFavorite(tool.key) && favPointerDown(e, tool.key, "home")}
        onclick={() => favClick(tool)}
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

  <div class="section dbx-hint"><Icon name="star" size={12} filled />{s.home.favs}</div>
  {#if favOrdered.length}
    <div class="grid">
      {#each favOrdered as tool}{@render cell(tool)}{/each}
    </div>
  {:else}
    <p class="fav-empty dbx-hint">{s.home.favEmpty}</p>
  {/if}
  <div class="section dbx-hint mid"><Icon name="grid" size={12} />{s.home.allTools}</div>
  {#if restOrdered.length}
    <div class="grid">
      {#each restOrdered as tool}{@render cell(tool)}{/each}
    </div>
  {:else}
    <p class="dbx-hint empty">{s.home.noResults}</p>
  {/if}
  {#if dnd.origin === "home" && dnd.key}
    <div class="card-ghost dbx-card" style="left:{dnd.x}px;top:{dnd.y}px;width:{dnd.w}px;min-height:{dnd.h}px">
      <span class="name">{s.tools[dnd.key]?.name}</span>
      <span class="desc dbx-hint">{s.tools[dnd.key]?.desc}</span>
    </div>
  {/if}
</ToolShell>

<style>
  .controls { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
  /* Gradient ring: the wrapper's padding shows a faint static gradient; the
     ::before overlay is a 2px hollow ring (mask-composite) whose gradient
     flows slowly — dim while idle, full-strength as the focus indicator. */
  .searchwrap {
    position: relative;
    max-width: 480px;
    padding: 2px;
    border-radius: calc(var(--radius-md) + 2px);
    background: linear-gradient(135deg, rgba(13, 148, 136, 0.24), rgba(45, 212, 191, 0.16));
  }
  .searchwrap::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 2px;
    background: linear-gradient(120deg, #0d9488, #5eead4, #99f6e4, #14b8a6, #0d9488);
    background-size: 320% 320%;
    animation: ringflow 6s ease infinite;
    opacity: 0.4;
    transition: opacity 0.35s ease;
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }
  .searchwrap:focus-within::before { opacity: 1; }
  .searchwrap > :global(.ic) {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-muted-foreground);
    pointer-events: none;
  }
  .search { width: 100%; height: 40px; font-size: 14px; padding: 0 14px 0 34px; border-color: transparent; }
  /* the flowing ring is the focus indicator; suppress the default outline */
  .searchwrap .search:focus { outline: none; }
  .search.has-clear { padding-right: 30px; }
  .clearbtn {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    border: 0;
    background: none;
    padding: 2px;
    cursor: pointer;
    color: var(--color-muted-foreground);
    display: inline-flex;
    border-radius: 3px;
  }
  .clearbtn:hover { color: var(--color-foreground); }
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
  .miniact {
    border: 0;
    background: none;
    padding: 1px 2px;
    cursor: pointer;
    color: inherit;
    display: inline-flex;
    border-radius: 3px;
  }
  .miniact:hover { color: var(--color-foreground); }
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
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    padding: 3px 4px;
    cursor: grab;
    color: var(--color-input);
    line-height: 0;
    border-radius: 4px;
  }
  .cell:hover .gripbox { color: var(--color-muted-foreground); }
  .cell.dragging .card { opacity: 0.45; cursor: grabbing; }
  .card-ghost {
    position: fixed;
    z-index: 120;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
    border-color: var(--color-primary);
    box-shadow: 0 10px 26px rgba(0, 0, 0, 0.2);
  }
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
  /* faved cards reserve a right gutter for the centered grip + star, so the
     name's own star clearance is redundant there */
  .cell.faved .card { padding-right: 30px; }
  .cell.faved .name { padding-right: 0; }
  .desc { flex: 1; }
  .tagrow { display: flex; flex-wrap: wrap; gap: 4px; }
  .mini-tag {
    font-size: 11px;
    padding: 1px 7px;
    border-radius: 9px;
    border: 1px solid var(--color-border);
    color: var(--color-muted-foreground);
  }
  .fav-empty { font-size: 12px; margin: 0 0 8px; }
  .empty { font-size: 14px; }

  @keyframes ringflow {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
  :global(:root[data-dbx-theme="dark"]) .searchwrap::before { opacity: 0.22; }
  :global(:root[data-dbx-theme="dark"]) .searchwrap:focus-within::before { opacity: 0.85; }
  @media (prefers-reduced-motion: reduce) {
    .searchwrap::before { animation: none; }
  }


</style>
