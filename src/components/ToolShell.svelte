<script>
  import { getContext } from "svelte";
  import { isFavorite, toggleFavorite } from "../lib/prefs.svelte.js";
  import { VISIBLE_TAGS } from "../lib/tools.js";
  import { t, onLangChange } from "../lib/i18n.js";
  import Icon from "./Icon.svelte";

  let { title = "", desc = "", version = "", children } = $props();
  // App provides the current tool entry; null on the home page means no star.
  const currentTool = getContext("currentTool");
  let s = $state(t());
  onLangChange(() => (s = t()));
</script>

<div class="shell">
  <header>
    <h1>
      {title}
      {#if version}<span class="ver">v{version}</span>{/if}
      {#if currentTool?.()}
        {@const key = currentTool().key}
        <button
          type="button"
          class="fav"
          class:faved={isFavorite(key)}
          title={isFavorite(key) ? s.home.unfav : s.home.fav}
          onclick={() => toggleFavorite(key)}
        ><Icon name="star" size={16} filled={isFavorite(key)} /></button>
      {/if}
    </h1>
    {#if desc}<p class="dbx-hint">{desc}</p>{/if}
    {#if currentTool?.()}
      {@const tags = currentTool().tags.filter((tag) => VISIBLE_TAGS.has(tag))}
      {#if tags.length}
        <div class="tagrow">
          {#each tags as tag}
            <span class="mini-tag">{s.tags[tag] || tag}</span>
          {/each}
        </div>
      {/if}
    {/if}
  </header>
  <div class="body">
    {@render children?.()}
  </div>
</div>

<style>
  .shell {
    max-width: 860px;
    margin: 0 auto;
    padding: 20px 24px 40px;
  }
  header h1 {
    margin: 0 0 4px;
    font-size: 20px;
    font-weight: 650;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  /* Version tag sits inside the h1 so bug-report screenshots always carry it. */
  .ver {
    font-size: 11px;
    font-weight: 400;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: var(--color-muted-foreground);
    border: 1px solid var(--color-border);
    border-radius: 9px;
    padding: 2px 7px;
  }
  .fav {
    border: 0;
    background: none;
    padding: 3px 5px;
    border-radius: var(--radius-md);
    cursor: pointer;
    color: var(--color-muted-foreground);
    display: inline-flex;
  }
  .fav:hover { color: var(--color-primary); background: var(--color-muted); }
  .fav.faved { color: #f0b429; }
  header {
    margin-bottom: 18px;
  }
  header p {
    margin: 0;
  }
  .tagrow {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 8px;
  }
  .mini-tag {
    font-size: 11px;
    padding: 1px 7px;
    border-radius: 9px;
    border: 1px solid var(--color-border);
    color: var(--color-muted-foreground);
  }
</style>
