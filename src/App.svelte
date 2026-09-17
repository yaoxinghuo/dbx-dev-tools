<script>
  import { ready, context, contributionId, onInit, onContext } from "./lib/bridge.js";
  import { resolveTool, TOOLS, Home } from "./lib/tools.js";
  import { t, onLangChange } from "./lib/i18n.js";

  let s = $state(t());
  onLangChange(() => (s = t()));

  let active = $state(null); // tool entry or null => Home
  let booted = $state(false);

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
</style>
