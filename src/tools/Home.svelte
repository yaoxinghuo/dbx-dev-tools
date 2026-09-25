<script>
  import { onMount } from "svelte";
  import ToolShell from "../components/ToolShell.svelte";
  import GripIcon from "../components/GripIcon.svelte";
  import Icon from "../components/Icon.svelte";
  import { TOOLS, CATEGORY_TAGS, VISIBLE_TAGS } from "../lib/tools.js";
  import { buildSearchIndex } from "../lib/toolsearch.js";
  import { isFavorite, toggleFavorite, recentKeys, favoriteKeys, clearRecent, isRecentEnabled, isTypingFx, toggleTypingFx } from "../lib/prefs.svelte.js";
  import { favPointerDown, dnd } from "../lib/favdnd.svelte.js";
  import { t, onLangChange, allMessages } from "../lib/i18n.js";
  import manifest from "../../manifest.json";

  let { onPick } = $props();
  let s = $state(t());
  onLangChange(() => (s = t()));

  let query = $state("");
  let activeTag = $state(null);
  const isMac = /Mac|iP/.test(navigator.platform || navigator.userAgent);

  function tagName(key) {
    return s.tags[key] || key;
  }

  // `s` is tracked so the index rebuilds when the UI language changes.
  const searchIndex = $derived.by(() => {
    s.home;
    return buildSearchIndex();
  });

  // Category cards list only category-level tags (shared by 2+ tools), sorted
  // by tool count; single-tool keyword tags stay reachable through search.
  const categories = CATEGORY_TAGS;

  // Show at most two rows of category chips; the trailing slot becomes a
  // "more" toggle that expands the rest. Column count mirrors the grid's
  // auto-fill rule (≥120px tracks + 8px gaps), so we measure the container.
  let catsEl;
  let catsW = $state(0);
  let catsOpen = $state(false);
  const catCap = $derived(catsW ? Math.max(1, Math.floor((catsW + 8) / 128)) * 2 : categories.length + 1);
  const catsFits = $derived(categories.length + 1 <= catCap);
  const shownCats = $derived(catsOpen || catsFits ? categories : categories.slice(0, catCap - 2));

  // Same two-row idea for the tool grid (≥220px tracks + 14px gaps), but only
  // in the default browse state — an active search/category filter means the
  // user asked for a specific list, so filtered results never collapse.
  let gridEl;
  let gridW = $state(0);
  let toolsOpen = $state(false);
  const gridCap = $derived(gridW ? Math.max(1, Math.floor((gridW + 14) / 234)) * 2 : restOrdered.length);
  const toolsFit = $derived(restOrdered.length <= gridCap);
  const shownTools = $derived(!canSort || toolsOpen || toolsFit ? restOrdered : restOrdered.slice(0, gridCap));

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

  const recentTools = $derived.by(() => {
    if (!isRecentEnabled()) return [];
    return recentKeys()
      .map((key) => TOOLS.find((tool) => tool.key === key))
      .filter(Boolean)
      .slice(0, 8);
  });

  // Deterministic per-tool dot hue so each recent chip gets a stable accent.
  function dotColor(key) {
    let h = 0;
    for (const c of key) h = (h * 31 + c.charCodeAt(0)) % 360;
    return `hsl(${h} 70% 50%)`;
  }

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
  // representative tool names (they double as valid search queries). Stops
  // while the box is focused or has content; resumes on blur when still empty.
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
  let searchEl;
  let typed = $state("");
  let typing = $state(false);
  let focused = $state(false);
  $effect(() => {
    const list = typeSamples;
    const base = s.home.searchPlaceholder;
    // Focus also stops the animation: the sandbox iframe can't autofocus on
    // open, so the first click is the real "I'm about to type" signal.
    if (query || focused || !isTypingFx() || !list.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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

  // ⌘K / Ctrl+K reaches here via App's global keydown → this event (when Home
  // is already mounted the app-level handler can't reach the input directly).
  const focusReq = () => searchEl?.focus();

  // Home is search-first: focus the box on mount so the typewriter placeholder
  // animates under the caret until the user types.
  onMount(() => {
    searchEl?.focus();
    window.addEventListener("dbx-focus-home-search", focusReq);
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        if (e.target === catsEl) catsW = e.contentRect.width;
        else if (e.target === gridEl) gridW = e.contentRect.width;
      }
    });
    ro.observe(catsEl);
    if (gridEl) ro.observe(gridEl);
    return () => { ro.disconnect(); window.removeEventListener("dbx-focus-home-search", focusReq); };
  });

</script>

<ToolShell title={s.homeTitle} desc={s.homeSubtitle} version={manifest.version}>
  <div class="controls">
    <div class="searchwrap">
      <Icon name="search" size={15} />
      <input
        class="dbx-input search"
        bind:this={searchEl}
        bind:value={query}
        onfocus={() => (focused = true)}
        onblur={() => (focused = false)}
        placeholder={typing ? typed + "▏" : s.home.searchPlaceholder}
      />
      <div class="searchacts">
        {#if query}
          <button type="button" class="clearbtn" title={s.home.clear} onclick={() => (query = "")}>
            <Icon name="x" size={13} />
          </button>
        {/if}
        <kbd class="kbd">{isMac ? "⌘K" : "Ctrl K"}</kbd>
        <button
          type="button"
          class="fxpill"
          class:on={isTypingFx()}
          role="switch"
          aria-checked={isTypingFx()}
          title={s.home.fxTip}
          onclick={toggleTypingFx}
        ><span class="fxdot"></span>{s.home.fxLabel}: {isTypingFx() ? s.home.fxOn : s.home.fxOff}</button>
      </div>
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
        <button type="button" class="recent-chip dbx-btn" onclick={() => onPick?.(tool)}>
          <span class="dot" style:background={dotColor(tool.key)}></span>{s.tools[tool.key].name}
        </button>
      {/each}
    </div>
  {/if}

  <div class="section dbx-hint">{s.home.browseCats}<span class="scount">{s.home.catTotal.replace("{n}", categories.length)}</span></div>
  <div class="cats" bind:this={catsEl}>
    <button
      type="button"
      class="cat"
      class:on={activeTag === null}
      onclick={() => (activeTag = null)}
    ><span>{s.home.filterAll}</span><span class="cnt">{TOOLS.length}</span></button>
    {#each shownCats as cat}
      <button
        type="button"
        class="cat"
        class:on={activeTag === cat.key}
        onclick={() => (activeTag = activeTag === cat.key ? null : cat.key)}
      ><span>{tagName(cat.key)}</span><span class="cnt">{cat.count}</span></button>
    {/each}
    {#if !catsFits}
      <button type="button" class="cat more" onclick={() => (catsOpen = !catsOpen)}>
        {#if catsOpen}
          <span>{s.home.lessCats}</span><Icon name="chevron" size={13} />
        {:else}
          <span>{s.home.moreCats}</span><span class="cnt">+{categories.length - shownCats.length}</span>
        {/if}
      </button>
    {/if}
  </div>

  <!-- compact drops the tag row — favorites are tools the user already knows
       well, so the cards stay slimmer without the discovery aids. -->
  {#snippet cell(tool, compact)}
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
        {#if !compact}
          <span class="tagrow">
            {#each tool.tags.filter((tag) => VISIBLE_TAGS.has(tag)) as tag}
              <span class="mini-tag">{tagName(tag)}</span>
            {/each}
          </span>
        {/if}
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

  <div class="section dbx-hint"><Icon name="star" size={12} filled />{s.home.favs}{#if favOrdered.length}<span class="scount">{s.home.favTotal.replace("{n}", favOrdered.length)}</span>{/if}</div>
  {#if favOrdered.length}
    <div class="grid">
      {#each favOrdered as tool}{@render cell(tool, true)}{/each}
    </div>
  {:else}
    <div class="fav-empty">
      <span class="fe-ic"><Icon name="star" size={15} /></span>
      <span class="fe-text">
        <span class="fe-title">{s.home.favEmptyTitle}</span>
        <span class="fe-hint dbx-hint">{s.home.favEmptyHint}</span>
      </span>
      <span class="fe-act dbx-hint">{s.home.favEmptyAction}</span>
    </div>
  {/if}
  <div class="section dbx-hint mid"><Icon name="grid" size={12} />{s.home.allTools}<span class="scount">{s.home.allTotal.replace("{n}", TOOLS.length)}</span></div>
  <div bind:this={gridEl}>
    {#if shownTools.length}
      <div class="grid">
        {#each shownTools as tool}{@render cell(tool)}{/each}
      </div>
    {:else}
      <p class="dbx-hint empty">{s.home.noResults}</p>
    {/if}
    {#if canSort && !toolsFit}
      <button type="button" class="morebar" onclick={() => (toolsOpen = !toolsOpen)}>
        {#if toolsOpen}
          {s.home.lessTools}<Icon name="chevron" size={13} />
        {:else}
          {s.home.moreTools.replace("{n}", restOrdered.length - shownTools.length)}
        {/if}
      </button>
    {/if}
  </div>
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
  .search { width: 100%; height: 40px; font-size: 14px; padding: 0 150px 0 34px; border-color: transparent; }
  /* the flowing ring is the focus indicator; suppress the default outline */
  .searchwrap .search:focus { outline: none; }
  .searchacts {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .clearbtn {
    border: 0;
    background: none;
    padding: 2px;
    cursor: pointer;
    color: var(--color-muted-foreground);
    display: inline-flex;
    border-radius: 3px;
  }
  .clearbtn:hover { color: var(--color-foreground); }
  .kbd {
    font: 10px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
    padding: 3px 5px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-muted);
    color: var(--color-muted-foreground);
  }
  /* Text-state pill toggle — quieter than a filled switch; the leading dot
     breathes (dim→mid, never glaring) while effects are on. */
  .fxpill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border: 1px solid var(--color-border);
    border-radius: 99px;
    background: transparent;
    font: inherit;
    font-size: 11px;
    color: var(--color-muted-foreground);
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }
  .fxpill:hover { border-color: var(--color-primary); }
  .fxpill.on { color: var(--color-primary); border-color: var(--color-primary); }
  .fxdot { width: 6px; height: 6px; border-radius: 50%; background: var(--color-muted-foreground); flex-shrink: 0; }
  .fxpill.on .fxdot { background: var(--color-primary); animation: fxbreath 2.4s ease-in-out infinite; }
  @keyframes fxbreath {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.95; }
  }
  @media (prefers-reduced-motion: reduce) {
    .fxpill.on .fxdot { animation: none; }
  }
  /* Match the sidebar .group label style so section headers read the same
     in both places. */
  .section { font-size: 11px; font-weight: 600; letter-spacing: .05em; margin: 0 0 8px; display: flex; align-items: center; gap: 5px; }
  .section .scount { margin-left: auto; font-weight: 400; }
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
  /* The more/less toggle is an action, not a filter — dashed border keeps it
     visually distinct from the selectable chips. */
  .cat.more { border-style: dashed; color: var(--color-muted-foreground); }
  .cat.more:hover { color: var(--color-foreground); }
  .cat.more :global(.ic) { transform: rotate(-90deg); }
  .cnt { font-size: 12px; color: var(--color-muted-foreground); }
  .recent { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 14px; }
  .recent-label { font-size: 12px; margin-right: 2px; display: inline-flex; align-items: center; gap: 5px; }
  .recent-chip { height: 26px; padding: 0 12px; font-size: 12px; border-radius: 13px; display: inline-flex; align-items: center; gap: 6px; }
  .recent-chip .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
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
  /* Full-width dashed bar for the grid's more/less toggle — same affordance
     language as the dashed category chip, scaled to the card grid. */
  .morebar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    margin-top: 14px;
    padding: 9px 12px;
    font: inherit;
    font-size: 13px;
    color: var(--color-muted-foreground);
    background: transparent;
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-md);
    cursor: pointer;
  }
  .morebar:hover { border-color: var(--color-primary); color: var(--color-foreground); }
  .morebar :global(.ic) { transform: rotate(-90deg); }
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
  /* Empty favorites panel: dashed call-to-action card (same affordance
     language as the more toggles) with a gold star tile. */
  .fav-empty {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    margin-bottom: 16px;
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-muted-foreground);
  }
  .fe-ic {
    display: inline-flex;
    padding: 9px;
    border-radius: 10px;
    background: var(--color-muted);
    color: #f0b429;
    flex-shrink: 0;
  }
  .fe-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .fe-title { font-size: 13px; font-weight: 600; color: var(--color-foreground); }
  .fe-hint { font-size: 12px; }
  .fe-act { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; flex-shrink: 0; }
  .fe-act :global(.ic) { color: #f0b429; }
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
