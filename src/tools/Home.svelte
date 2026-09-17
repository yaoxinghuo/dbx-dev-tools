<script>
  import ToolShell from "../components/ToolShell.svelte";
  import { TOOLS } from "../lib/tools.js";
  import { t, onLangChange } from "../lib/i18n.js";

  let { onPick } = $props();
  let s = $state(t());
  onLangChange(() => (s = t()));
</script>

<ToolShell title={s.homeTitle} desc={s.homeSubtitle}>
  <div class="grid">
    {#each TOOLS as tool}
      <button type="button" class="card dbx-card" onclick={() => onPick?.(tool)}>
        <span class="name">{s.tools[tool.key].name}</span>
        <span class="desc dbx-hint">{s.tools[tool.key].desc}</span>
        <span class="open dbx-link">{s.open} ›</span>
      </button>
    {/each}
  </div>
</ToolShell>

<style>
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
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
</style>
