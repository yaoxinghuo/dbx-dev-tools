<script>
  import { getContext } from "svelte";
  import { isFavorite, toggleFavorite } from "../lib/prefs.svelte.js";
  import { t, onLangChange } from "../lib/i18n.js";

  let { title = "", desc = "", children } = $props();
  // App provides the current tool entry; null on the home page means no star.
  const currentTool = getContext("currentTool");
  let s = $state(t());
  onLangChange(() => (s = t()));
</script>

<div class="shell">
  <header>
    <h1>
      {title}
      {#if currentTool?.()}
        {@const key = currentTool().key}
        <button
          type="button"
          class="fav"
          class:faved={isFavorite(key)}
          title={isFavorite(key) ? s.home.unfav : s.home.fav}
          onclick={() => toggleFavorite(key)}
        >{isFavorite(key) ? "★" : "☆"}</button>
      {/if}
    </h1>
    {#if desc}<p class="dbx-hint">{desc}</p>{/if}
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
  .fav {
    border: 0;
    background: none;
    font-size: 16px;
    line-height: 1;
    padding: 3px 5px;
    border-radius: var(--radius-md);
    cursor: pointer;
    color: var(--color-muted-foreground);
  }
  .fav:hover { color: var(--color-primary); background: var(--color-muted); }
  .fav.faved { color: #f0b429; }
  header {
    margin-bottom: 18px;
  }
  header p {
    margin: 0;
  }
</style>
