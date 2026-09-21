<script>
  import { ready, context, contributionId, onInit, onContext } from "./lib/bridge.js";
  import { resolveTool, TOOLS, Home } from "./lib/tools.js";
  import { buildSearchIndex } from "./lib/toolsearch.js";
  import { t, onLangChange } from "./lib/i18n.js";

  let s = $state(t());
  onLangChange(() => (s = t()));

  let active = $state(null); // tool entry or null => Home
  let booted = $state(false);

  let navQuery = $state("");
  let navOpen = $state(false);

  // `s` is tracked so the index re-localizes when the UI language changes.
  const navIndex = $derived.by(() => {
    s.home;
    return buildSearchIndex();
  });
  const navResults = $derived.by(() => {
    const q = navQuery.trim().toLowerCase();
    if (!q) return [];
    return TOOLS.filter((tool) => (navIndex.get(tool.key) || "").includes(q)).slice(0, 8);
  });

  // Any tool switch (sidebar, dropdown or host context) clears the search.
  $effect(() => {
    active;
    navQuery = "";
  });

  function pick(tool) {
    active = tool;
    navOpen = false;
  }

  function onNavKey(e) {
    if (e.key === "Escape") {
      navQuery = "";
      e.currentTarget.blur();
    } else if (e.key === "Enter" && navResults.length) {
      pick(navResults[0]);
    }
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
      <button type="button" class="brand" class:active={!active} onclick={() => (active = null)}>
        {s.homeTitle}
      </button>
      <div class="sep"></div>
      {#each TOOLS as tool}
        <button type="button" class="item" class:active={active === tool} onclick={() => (active = tool)}>
          {s.tools[tool.key].name}
        </button>
      {/each}
    </nav>
    <main>
      {#if active}
        <div class="topbar">
          <button type="button" class="back" onclick={() => (active = null)}>‹ 🏠 {s.home.back}</button>
          <div class="navsearch">
            <input
              class="dbx-input"
              bind:value={navQuery}
              placeholder={s.home.searchPlaceholder}
              onfocus={() => (navOpen = true)}
              onblur={() => setTimeout(() => (navOpen = false), 150)}
              onkeydown={onNavKey}
            />
            {#if navOpen && navQuery.trim()}
              <div class="navdrop">
                {#each navResults as tool}
                  <button type="button" class="navitem" onmousedown={() => pick(tool)}>
                    <span class="nname">{s.tools[tool.key].name}</span>
                    <span class="ndesc">{s.tools[tool.key].desc}</span>
                  </button>
                {:else}
                  <div class="navitem empty">{s.home.noResults}</div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
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
  .brand {
    border: 0;
    background: none;
    font: inherit;
    font-size: 15px;
    font-weight: 700;
    text-align: left;
    padding: 6px 10px;
    border-radius: var(--radius-md);
    cursor: pointer;
    color: var(--color-foreground);
  }
  .sep { height: 1px; background: var(--color-border); margin: 8px 4px; }
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
  .item.active, .brand.active { background: var(--color-primary); color: var(--color-primary-foreground); }
  main { flex: 1; min-width: 0; }
  .topbar {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 24px;
    background: var(--color-background);
    border-bottom: 1px solid var(--color-border);
  }
  .back {
    border: 0;
    background: none;
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    color: var(--color-muted-foreground);
    cursor: pointer;
    padding: 4px 8px;
    border-radius: var(--radius-md);
    white-space: nowrap;
  }
  .back:hover { color: var(--color-foreground); background: var(--color-muted); }
  .navsearch { position: relative; margin-left: auto; width: 320px; max-width: 55%; }
  .navsearch .dbx-input { width: 100%; }
  .navdrop {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    width: 100%;
    max-height: 320px;
    overflow-y: auto;
    background: var(--color-card);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: 0 8px 24px rgba(0, 0, 0, .18);
    padding: 4px;
  }
  .navitem {
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 100%;
    border: 0;
    background: none;
    font: inherit;
    text-align: left;
    padding: 7px 10px;
    border-radius: var(--radius-md);
    cursor: pointer;
    color: var(--color-foreground);
  }
  .navitem:hover { background: var(--color-muted); }
  .navitem.empty { cursor: default; color: var(--color-muted-foreground); font-size: 12px; }
  .navitem.empty:hover { background: none; }
  .nname { font-size: 13px; font-weight: 600; }
  .ndesc {
    font-size: 12px;
    color: var(--color-muted-foreground);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
