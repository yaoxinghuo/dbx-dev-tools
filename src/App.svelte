<script>
  import { setContext, tick } from "svelte";
  import { ready, context, contributionId, onInit, onContext } from "./lib/bridge.js";
  import { resolveTool, TOOLS, Home } from "./lib/tools.js";
  import { buildSearchIndex } from "./lib/toolsearch.js";
  import { recordRecent, recentKeys, favoriteKeys, isAllCollapsed, toggleAllCollapsed, isNavCollapsed, setNavCollapsed, clearRecent, isFavorite, toggleFavorite, isRecentCollapsed, toggleRecentCollapsed, setRecentCollapsed, isRecentEnabled, setRecentEnabled } from "./lib/prefs.svelte.js";
  import { favPointerDown, dnd } from "./lib/favdnd.svelte.js";
  import GripIcon from "./components/GripIcon.svelte";
  import Icon from "./components/Icon.svelte";
  import { t, onLangChange } from "./lib/i18n.js";

  let s = $state(t());
  onLangChange(() => (s = t()));

  let active = $state(null); // tool entry or null => Home
  let booted = $state(false);

  // ToolShell reads this so every tool title gets a favorite star without
  // passing the key through 40 components by hand.
  setContext("currentTool", () => active);

  let navQuery = $state("");

  const toolByKey = new Map(TOOLS.map((tool) => [tool.key, tool]));

  const recentTools = $derived.by(() => {
    if (!isRecentEnabled()) return [];
    return recentKeys()
      .map((key) => toolByKey.get(key))
      .filter(Boolean);
  });
  const favTools = $derived.by(() =>
    favoriteKeys()
      .map((key) => toolByKey.get(key))
      .filter(Boolean)
  );

  // `s` is tracked so the index re-localizes when the UI language changes.
  const navIndex = $derived.by(() => {
    s.home;
    return buildSearchIndex();
  });
  const navResults = $derived.by(() => {
    const q = navQuery.trim().toLowerCase();
    if (!q) return null; // null => browsing mode, show grouped lists
    return TOOLS.filter((tool) => (navIndex.get(tool.key) || "").includes(q));
  });

  // Any tool switch (sidebar, search or host context) clears the search and
  // counts as usage for the home page's recent list.
  $effect(() => {
    if (active) recordRecent(active.key);
    navQuery = "";
  });

  function pick(tool) {
    active = tool;
  }

  // Icon-rail shortcuts: section icons expand the sidebar (and, for search,
  // focus the input); the grid icon also un-collapses the 全部工具 group.
  let navSearchEl;
  async function railSearch() {
    setNavCollapsed(false);
    await tick();
    navSearchEl?.focus();
  }
  function railAllTools() {
    setNavCollapsed(false);
    if (isAllCollapsed()) toggleAllCollapsed();
  }

  function onNavKey(e) {
    if (e.key === "Escape") {
      navQuery = "";
      e.currentTarget.blur();
    } else if (e.key === "Enter" && navResults?.length) {
      pick(navResults[0]);
    }
  }

  function favClick(tool) {
    // A pointer drag ends with a click on whatever row the pointer released
    // over — swallow it so a reorder doesn't also navigate.
    if (dnd.moved) return;
    pick(tool);
  }

  function initialTool() {
    // In-plugin navigation can name the tool in context; opening a workbench
    // from the host sidebar identifies it by contributionId (production only).
    return resolveTool(context()?.tool) || resolveTool(contributionId());
  }

  // Mouse parallax for the ambient blob layers; skipped under reduced motion.
  let par = $state({ x: 0, y: 0 });
  $effect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const move = (e) => {
      par = {
        x: (e.clientX / window.innerWidth - 0.5) * 46,
        y: (e.clientY / window.innerHeight - 0.5) * 46,
      };
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  });

  $effect(() => {
    ready().then(() => {
      if (!booted) active = initialTool();
      booted = true;
    });
    onInit(() => {
      if (!booted) active = initialTool();
      booted = true;
    });
    onContext((ctx) => {
      const next = resolveTool(ctx?.tool);
      if (next) active = next;
    });
  });
</script>

{#if booted}
  <div class="layout">
    <nav class:collapsed={isNavCollapsed()}>
      {#if isNavCollapsed()}
        <button type="button" class="railbtn" title={s.home.expandNav} onclick={() => setNavCollapsed(false)}>
          <Icon name="chevrons-right" size={15} />
        </button>
        <button type="button" class="railbtn" class:active={!active} title={s.home.back} onclick={() => (active = null)}>
          <Icon name="home" size={16} />
        </button>
        <button type="button" class="railbtn" title={s.home.searchNav} onclick={railSearch}>
          <Icon name="search" size={15} />
        </button>
        {#if favTools.length}
          <button type="button" class="railbtn" title={s.home.favs} onclick={() => setNavCollapsed(false)}>
            <Icon name="star" size={15} />
          </button>
        {/if}
        <button type="button" class="railbtn" title={s.home.recent} onclick={() => { setNavCollapsed(false); setRecentCollapsed(false); }}>
          <Icon name="clock" size={15} />
        </button>
        <button type="button" class="railbtn" title={s.home.allTools} onclick={railAllTools}>
          <Icon name="grid" size={15} />
        </button>
      {:else}
      <div class="navtop">
        <button type="button" class="brand" title={s.home.back} onclick={() => (active = null)}>{s.homeTitle}</button>
        <button type="button" class="railbtn collapser" title={s.home.collapseNav} onclick={() => setNavCollapsed(true)}>
          <Icon name="chevrons-left" size={14} />
        </button>
      </div>
      <button type="button" class="item navitem" class:active={!active} onclick={() => (active = null)}>
        <Icon name="home" size={14} />{s.home.back}<span class="count">{TOOLS.length}</span>
      </button>
      <div class="searchwrap">
        <Icon name="search" size={13} />
        <input
          class="navsearch dbx-input"
          class:has-clear={navQuery}
          bind:this={navSearchEl}
          bind:value={navQuery}
          placeholder={s.home.searchPlaceholder}
          onkeydown={onNavKey}
        />
        {#if navQuery}
          <button type="button" class="clearbtn" title={s.home.clear} onclick={() => { navQuery = ""; navSearchEl?.focus(); }}>
            <Icon name="x" size={12} />
          </button>
        {/if}
      </div>
      <div class="navscroll">
      {#snippet toolRow(tool)}
        <div class="toolitem" class:active={active?.key === tool.key}>
          <button type="button" class="toolpick" onclick={() => pick(tool)}>
            {s.tools[tool.key].name}
          </button>
          <button
            type="button"
            class="favicon"
            class:faved={isFavorite(tool.key)}
            title={isFavorite(tool.key) ? s.home.unfav : s.home.fav}
            onclick={() => toggleFavorite(tool.key)}
          ><Icon name="star" size={12} filled={isFavorite(tool.key)} /></button>
        </div>
      {/snippet}
      {#if navResults}
        {#each navResults as tool}
          {@render toolRow(tool)}
        {:else}
          <div class="empty dbx-hint">{s.home.noResults}</div>
        {/each}
      {:else}
        {#if favTools.length}
          <div class="group dbx-hint"><Icon name="star" size={11} filled />{s.home.favs}<span class="count">{favTools.length}</span></div>
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="droplist">
            {#each favTools as tool (tool.key)}
              <button
                type="button"
                class="item fav-item"
                class:active={active?.key === tool.key}
                class:dragging={dnd.key === tool.key}
                data-favkey={tool.key}
                title={s.home.dragReorder}
                onpointerdown={(e) => favPointerDown(e, tool.key, "nav")}
                onclick={() => favClick(tool)}
              ><span class="label">{s.tools[tool.key].name}</span><GripIcon /></button>
            {/each}
          </div>
        {/if}
        {#if dnd.origin === "nav" && dnd.key}
          <div class="fav-ghost" style="left:{dnd.x}px;top:{dnd.y}px;width:{dnd.w}px;height:{dnd.h}px">
            <GripIcon /><span class="label">{s.tools[dnd.key]?.name}</span>
          </div>
        {/if}
        <button type="button" class="group grouptoggle dbx-hint" onclick={toggleAllCollapsed}>
          <Icon name="grid" size={11} />{s.home.allTools}
          <span class="chev" class:open={!isAllCollapsed()}><Icon name="chevron" size={13} /></span>
        </button>
        {#if !isAllCollapsed()}
          {#each TOOLS as tool}
            {@render toolRow(tool)}
          {/each}
        {/if}
      {/if}
      </div>
      <!-- The dock is a permanent fixture: it hosts the privacy switch, so it
           must stay reachable even when recents are off or simply empty. -->
      <div class="recentdock">
          <div class="group dbx-hint">
            <Icon name="clock" size={11} />{s.home.recent}
            {#if isRecentEnabled()}
              <button type="button" class="miniact" title={s.home.clearRecent} onclick={clearRecent}>
                <Icon name="trash" size={11} />
              </button>
            {/if}
            <span class="dockacts">
              <button
                type="button"
                class="switch"
                class:on={isRecentEnabled()}
                role="switch"
                aria-checked={isRecentEnabled()}
                title={isRecentEnabled() ? s.home.recentOff : s.home.recentOn}
                onclick={() => { const on = !isRecentEnabled(); setRecentEnabled(on); if (on) setRecentCollapsed(false); }}
              ><span class="knob"></span></button>
              {#if isRecentEnabled()}
                <button
                  type="button"
                  class="miniact"
                  title={isRecentCollapsed() ? s.home.expandGroup : s.home.collapseGroup}
                  aria-expanded={!isRecentCollapsed()}
                  onclick={toggleRecentCollapsed}
                >
                  <span class="chev" class:open={!isRecentCollapsed()}><Icon name="chevron" size={13} /></span>
                </button>
              {/if}
            </span>
          </div>
          {#if isRecentEnabled() && !isRecentCollapsed()}
            <div class="recentlist">
              {#each recentTools as tool}
                <button type="button" class="item" class:active={active?.key === tool.key} onclick={() => pick(tool)}>
                  {s.tools[tool.key].name}
                </button>
              {:else}
                <div class="empty dbx-hint">{s.home.recentEmpty}</div>
              {/each}
            </div>
          {/if}
          {#if !isRecentEnabled()}
            <div class="empty dbx-hint">{s.home.recentOffNote}</div>
          {/if}
        </div>
      {/if}
    </nav>
    <main>
      <div class="ambient" aria-hidden="true">
        <span class="layer" style:transform="translate3d({par.x * 0.9}px, {par.y * 0.7}px, 0)"><span class="blob mint"></span></span>
        <span class="layer" style:transform="translate3d({par.x * -0.8}px, {par.y * 0.6}px, 0)"><span class="blob cyan"></span></span>
        <span class="layer" style:transform="translate3d({par.x * 0.6}px, {par.y * -0.5}px, 0)"><span class="blob aqua"></span></span>
        <span class="layer" style:transform="translate3d({par.x * -0.5}px, {par.y * -0.8}px, 0)"><span class="blob teal"></span></span>
        <span class="grain"></span>
      </div>
      {#if active}
        <active.component />
      {:else}
        <Home onPick={(tool) => (active = tool)} />
      {/if}
    </main>
  </div>
{/if}

<style>
  .layout {
    display: flex;
    min-height: 100vh;
    /* Brand teal. The host injects --color-* tokens as inline styles on <html>,
       which beat :root rules — redefining on .layout wins inside the plugin
       subtree regardless of host defaults. */
    --color-primary: #0d9488;
    --color-ring: #0d9488;
    /* Native controls (checkbox/radio/range) use accent-color, not
       --color-primary — inherit the brand color into them here. */
    accent-color: var(--color-primary);
  }
  /* Teal-500 reads better on dark backgrounds than teal-600, and the lighter
     ring keeps the focus outline visible there. */
  :global(:root[data-dbx-theme="dark"]) .layout {
    --color-primary: #14b8a6;
    --color-ring: #2dd4bf;
  }
  nav {
    width: 176px;
    flex-shrink: 0;
    /* Horizontal inset lives on the sections, not the nav: navscroll carries
       it as padding so its scrollbar hugs the nav's right edge. */
    padding: 8px 0;
    border-right: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    gap: 2px;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
  }
  /* column flex children shrink by default and squish below their set
     heights when the nav overflows; disable it so the nav scrolls */
  nav > * { flex-shrink: 0; }
  nav.collapsed { width: 46px; padding: 14px 8px; align-items: center; }
  .navtop { display: flex; align-items: center; justify-content: space-between; margin: 0 10px; }
  .brand {
    font: inherit;
    font-size: 14px;
    font-weight: 650;
    padding: 2px 8px;
    border: 0;
    background: none;
    color: inherit;
    cursor: pointer;
    border-radius: var(--radius-md);
  }
  .brand:hover { background: var(--color-muted); }
  .navitem { display: flex; align-items: center; gap: 6px; margin: 0 10px; }
  .navitem .count {
    margin-left: auto;
    font-size: 10.5px;
    line-height: 16px;
    padding: 0 7px;
    border-radius: 99px;
    background: var(--color-muted);
    color: var(--color-muted-foreground);
  }
  .navitem.active .count { background: rgba(0, 0, 0, 0.16); color: inherit; }
  .group .count { margin-left: auto; font-weight: 500; }
  .railbtn {
    border: 0;
    background: none;
    width: 30px;
    height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    cursor: pointer;
    color: var(--color-foreground);
    flex-shrink: 0;
  }
  .railbtn:hover { background: var(--color-muted); }
  .railbtn.active { background: var(--color-primary); color: var(--color-primary-foreground); }
  .collapser { color: var(--color-muted-foreground); }
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
  /* Recents dock actions: switch + chevron pinned to the row's right edge,
     trash sits next to the label like the home recents row does. */
  .dockacts { margin-left: auto; display: inline-flex; align-items: center; gap: 4px; }
  .switch {
    position: relative;
    width: 24px;
    height: 14px;
    padding: 0;
    border: 1px solid var(--color-border);
    border-radius: 99px;
    background: var(--color-muted);
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s, border-color 0.15s;
  }
  .switch .knob {
    position: absolute;
    top: 1px;
    left: 1px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--color-muted-foreground);
    transition: transform 0.15s, background 0.15s;
  }
  .switch.on { background: var(--color-primary); border-color: var(--color-primary); }
  .switch.on .knob { transform: translateX(10px); background: #fff; }
  .searchwrap { position: relative; margin: 10px 10px 4px; }
  /* the magnifier sits inside the input; padding keeps text clear of it */
  .searchwrap > :global(.ic) {
    position: absolute;
    left: 9px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-muted-foreground);
    pointer-events: none;
  }
  .searchwrap .navsearch { width: 100%; padding-left: 27px; }
  .searchwrap .navsearch.has-clear { padding-right: 24px; }

  /* Ambient backdrop shared by every page: fixed behind everything (negative
     z paints above the page background but below in-flow content),
     pointer-transparent. */
  .ambient {
    position: fixed;
    inset: 0;
    z-index: -1;
    overflow: hidden;
    pointer-events: none;
  }
  .layer {
    position: absolute;
    inset: 0;
    will-change: transform;
    transition: transform 0.9s cubic-bezier(0.22, 0.61, 0.36, 1);
  }
  .blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(70px);
    opacity: 0.18;
    will-change: transform, filter;
    animation: ambient-float 18s ease-in-out infinite alternate,
      ambient-tint 42s ease-in-out infinite alternate;
  }
  /* Blob hues stay in the teal/cyan family so the ambient wash matches the
     brand color instead of the original gold/lavender palette. */
  .blob.mint {
    top: -10%;
    left: 14%;
    width: 520px;
    height: 520px;
    background: radial-gradient(circle at 34% 32%, rgba(94, 234, 212, 0.9), rgba(94, 234, 212, 0) 70%);
  }
  .blob.cyan {
    top: 2%;
    right: -8%;
    width: 480px;
    height: 480px;
    background: radial-gradient(circle at 58% 40%, rgba(103, 232, 249, 0.85), rgba(103, 232, 249, 0) 70%);
    animation-duration: 22s, 52s;
    animation-delay: -5s, -12s;
  }
  .blob.aqua {
    bottom: -18%;
    left: 24%;
    width: 460px;
    height: 460px;
    background: radial-gradient(circle at 50% 50%, rgba(153, 246, 228, 0.8), rgba(153, 246, 228, 0) 70%);
    animation-duration: 26s, 61s;
    animation-delay: -9s, -26s;
  }
  .blob.teal {
    right: 12%;
    bottom: -14%;
    width: 420px;
    height: 420px;
    background: radial-gradient(circle at 46% 46%, rgba(45, 212, 191, 0.7), rgba(45, 212, 191, 0) 70%);
    animation-duration: 24s, 47s;
    animation-delay: -14s, -33s;
  }
  .grain {
    position: absolute;
    inset: 0;
    opacity: 0.22;
    mix-blend-mode: soft-light;
    background-image: radial-gradient(rgba(45, 85, 80, 0.15) 0.5px, transparent 0.6px);
    background-size: 3px 3px;
  }
  :global(:root[data-dbx-theme="dark"]) .blob { opacity: 0.09; }
  :global(:root[data-dbx-theme="dark"]) .grain { opacity: 0.08; }
  @media (prefers-reduced-motion: reduce) {
    .layer { transition: none; }
    .blob { animation: none; opacity: 0.12; }
  }
  .clearbtn {
    position: absolute;
    right: 5px;
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
  .group {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .05em;
    color: var(--color-muted-foreground);
    margin-top: 12px;
    padding: 10px 10px 4px;
    border-top: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .grouptoggle {
    width: 100%;
    border: 0;
    border-top: 1px solid var(--color-border);
    background: none;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .grouptoggle:hover { color: var(--color-foreground); }
  .grouptoggle .chev { margin-left: auto; }
  .chev { display: inline-flex; transition: transform .15s; }
  .chev.open { transform: rotate(90deg); }
  /* Middle scroll region: top block (brand/home/search) and the bottom
     recent dock stay fixed, only this band scrolls. */
  .navscroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; padding: 0 10px; }
  .navscroll > * { flex-shrink: 0; }
  /* 最近使用 pinned to the nav bottom: a stable strip that doesn't push the
     lists above around as entries rotate. */
  .recentdock { border-top: 1px solid var(--color-border); margin-top: 4px; padding: 0 10px; }
  .recentdock .group { border-top: 0; margin-top: 0; padding-top: 8px; padding-bottom: 3px; }
  .recentlist { display: flex; flex-direction: column; gap: 1px; max-height: 130px; overflow-y: auto; }
  /* Recent rows are denser than nav rows, and recent/favorites active use a
     text accent instead of a filled block — the big primary fill is reserved
     for the all-tools list so competing highlights don't distract. */
  .recentlist .item { font-size: 12px; padding: 4px 10px; }
  .recentlist .item.active,
  .fav-item.item.active { background: none; color: var(--color-primary); font-weight: 600; }
  .droplist { display: flex; flex-direction: column; gap: 2px; border-radius: var(--radius-md); }
  .item {
    border: 0;
    background: none;
    font: inherit;
    font-size: 13px;
    text-align: left;
    padding: 7px 10px;
    border-radius: var(--radius-md);
    cursor: pointer;
    color: var(--color-foreground);
  }
  .item:hover { background: var(--color-muted); }
  .item.active { background: var(--color-primary); color: var(--color-primary-foreground); }
  .fav-item { display: flex; align-items: center; gap: 6px; cursor: grab; }
  .fav-item .label { flex: 1; min-width: 0; }
  .fav-item :global(.grip) { color: var(--color-input); flex-shrink: 0; }
  .fav-item:hover :global(.grip) { color: var(--color-muted-foreground); }
  .fav-item.dragging { opacity: 0.45; cursor: grabbing; }
  .fav-ghost {
    position: fixed;
    z-index: 120;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 10px;
    font-size: 13px;
    color: var(--color-foreground);
    background: var(--color-popover, var(--color-card));
    border: 1px solid var(--color-primary);
    border-radius: var(--radius-md);
    box-shadow: 0 10px 26px rgba(0, 0, 0, 0.2);
    pointer-events: none;
  }
  .fav-ghost .label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .fav-ghost :global(.grip) { color: var(--color-muted-foreground); flex-shrink: 0; }
  /* all-tools rows: name button + a quick-fav star on the right */
  .toolitem { display: flex; align-items: center; border-radius: var(--radius-md); }
  .toolitem:hover { background: var(--color-muted); }
  .toolitem.active { background: var(--color-primary); }
  .toolpick {
    flex: 1;
    min-width: 0;
    border: 0;
    background: none;
    font: inherit;
    font-size: 13px;
    text-align: left;
    padding: 7px 4px 7px 10px;
    cursor: pointer;
    color: var(--color-foreground);
  }
  .toolitem.active .toolpick { color: var(--color-primary-foreground); }
  .favicon {
    border: 0;
    background: none;
    padding: 5px 8px 5px 4px;
    cursor: pointer;
    color: var(--color-input);
    display: inline-flex;
    flex-shrink: 0;
  }
  .toolitem:hover .favicon { color: var(--color-muted-foreground); }
  .favicon.faved { color: #f0b429; }
  .toolitem.active .favicon { color: var(--color-primary-foreground); }
  .toolitem.active .favicon.faved { color: #f0b429; }
  .empty { font-size: 12px; padding: 8px 10px; }
  main { flex: 1; min-width: 0; }
</style>
