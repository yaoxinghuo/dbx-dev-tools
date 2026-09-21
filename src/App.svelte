<script>
  import { setContext } from "svelte";
  import { ready, context, contributionId, onInit, onContext } from "./lib/bridge.js";
  import { resolveTool, TOOLS, Home } from "./lib/tools.js";
  import { buildSearchIndex } from "./lib/toolsearch.js";
  import { recordRecent, recentKeys, favoriteKeys, moveFavorite, isAllCollapsed, toggleAllCollapsed } from "./lib/prefs.svelte.js";
  import GripIcon from "./components/GripIcon.svelte";
  import { t, onLangChange } from "./lib/i18n.js";

  let s = $state(t());
  onLangChange(() => (s = t()));

  let active = $state(null); // tool entry or null => Home
  let booted = $state(false);

  // ToolShell reads this so every tool title gets a favorite star without
  // passing the key through 40 components by hand.
  setContext("currentTool", () => active);

  let navQuery = $state("");
  let dragKey = $state(null); // favorites drag-to-reorder payload
  let dropKey = $state(null); // item currently hovered as a drop target

  const toolByKey = new Map(TOOLS.map((tool) => [tool.key, tool]));

  const recentTools = $derived.by(() =>
    recentKeys()
      .map((key) => toolByKey.get(key))
      .filter(Boolean)
  );
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

  function onNavKey(e) {
    if (e.key === "Escape") {
      navQuery = "";
      e.currentTarget.blur();
    } else if (e.key === "Enter" && navResults?.length) {
      pick(navResults[0]);
    }
  }

  // HTML5 DnD: favorites reorder. Dragging over an item marks it as the
  // insertion point; dropping reorders via moveFavorite.
  function favDragOver(e, tool) {
    if (!dragKey || dragKey === tool.key) return;
    e.preventDefault();
    dropKey = tool.key;
  }

  function favDrop(e, tool) {
    e.preventDefault();
    e.stopPropagation(); // item drop must not bubble to the list's own handler
    if (dragKey) moveFavorite(dragKey, tool?.key ?? null);
    dragKey = null;
    dropKey = null;
  }

  function initialTool() {
    // In-plugin navigation can name the tool in context; opening a workbench
    // from the host sidebar identifies it by contributionId (production only).
    return resolveTool(context()?.tool) || resolveTool(contributionId());
  }

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
    <nav>
      <button type="button" class="item" class:active={!active} onclick={() => (active = null)}>
        🏠 {s.home.back}
      </button>
      <input
        class="navsearch dbx-input"
        bind:value={navQuery}
        placeholder={s.home.searchPlaceholder}
        onkeydown={onNavKey}
      />
      {#if navResults}
        {#each navResults as tool}
          <button type="button" class="item" class:active={active === tool} onclick={() => pick(tool)}>
            {s.tools[tool.key].name}
          </button>
        {:else}
          <div class="empty dbx-hint">{s.home.noResults}</div>
        {/each}
      {:else}
        {#if favTools.length}
          <div class="group dbx-hint">★ {s.home.favs}</div>
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="droplist" ondragover={(e) => e.preventDefault()} ondrop={(e) => favDrop(e, null)}>
            {#each favTools as tool (tool.key)}
              <button
                type="button"
                class="item fav-item"
                class:active={active === tool}
                class:drop={dropKey === tool.key}
                draggable="true"
                title={s.home.dragReorder}
                ondragstart={(e) => {
                  dragKey = tool.key;
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", tool.key);
                  e.dataTransfer.setDragImage(e.currentTarget, e.offsetX, e.offsetY);
                }}
                ondragend={() => { dragKey = null; dropKey = null; }}
                ondragover={(e) => favDragOver(e, tool)}
                ondrop={(e) => favDrop(e, tool)}
                onclick={() => pick(tool)}
              ><GripIcon /><span class="label">{s.tools[tool.key].name}</span></button>
            {/each}
          </div>
        {/if}
        {#if recentTools.length}
          <div class="group dbx-hint">🕘 {s.home.recent}</div>
          {#each recentTools as tool}
            <button type="button" class="item" class:active={active === tool} onclick={() => pick(tool)}>
              {s.tools[tool.key].name}
            </button>
          {/each}
        {/if}
        <button type="button" class="group grouptoggle dbx-hint" onclick={toggleAllCollapsed}>
          <span class="chev" class:open={!isAllCollapsed()}>▸</span>{s.home.allTools}
        </button>
        {#if !isAllCollapsed()}
          {#each TOOLS as tool}
            <button type="button" class="item" class:active={active === tool} onclick={() => pick(tool)}>
              {s.tools[tool.key].name}
            </button>
          {/each}
        {/if}
      {/if}
    </nav>
    <main>
      {#if active}
        <active.component />
      {:else}
        <Home onPick={(tool) => (active = tool)} />
      {/if}
    </main>
  </div>
{/if}

<style>
  .layout { display: flex; min-height: 100vh; }
  nav {
    width: 176px;
    flex-shrink: 0;
    padding: 14px 10px;
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
  .navsearch {
    margin: 8px 0 10px;
  }
  .group {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .05em;
    color: var(--color-muted-foreground);
    margin-top: 12px;
    padding: 10px 10px 4px;
    border-top: 1px solid var(--color-border);
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
  .chev { display: inline-block; transition: transform .15s; font-size: 12px; line-height: 1; }
  .chev.open { transform: rotate(90deg); }
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
  .fav-item.active :global(.grip),
  .fav-item.active:hover :global(.grip) { color: var(--color-primary-foreground); }
  .fav-item.drop { box-shadow: inset 0 2px 0 var(--color-primary); }
  .empty { font-size: 12px; padding: 8px 10px; }
  main { flex: 1; min-width: 0; }
</style>
