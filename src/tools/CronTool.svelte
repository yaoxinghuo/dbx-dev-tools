<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { parseCron, nextRuns, describeCron } from "../lib/cron.js";
  import { t, lang, onLangChange } from "../lib/i18n.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.cron);
  const c = $derived(s.cron);

  let input = $state("*/15 9-18 * * 1-5");
  let now = $state(Date.now());

  const PRESETS = ["*/5 * * * *", "0 * * * *", "0 0 * * *", "0 0 * * 0", "0 9 * * 1-5", "30 3 1 * *"];

  const cron = $derived(input.trim() ? parseCron(input) : undefined);
  const summary = $derived(cron ? describeCron(cron, lang() === "zh" ? "zh" : "en") : "");
  const runs = $derived(cron ? nextRuns(cron, new Date(now), 5) : []);

  function refresh() {
    now = Date.now();
  }

  const fmt = (d) =>
    d.toLocaleString(lang() === "zh" ? "zh-CN" : "en-US", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", weekday: "short",
    });
  const FIELD_ORDER = ["minute", "hour", "dom", "month", "dow"];
  const SHORTHAND = { "@daily": "0 0 * * *", "@midnight": "0 0 * * *", "@hourly": "0 * * * *", "@weekly": "0 0 * * 0", "@monthly": "0 0 1 * *", "@yearly": "0 0 1 1 *", "@annually": "0 0 1 1 *" };
  const expandedExpr = $derived.by(() => {
    const text = input.trim().toLowerCase();
    const parts = (SHORTHAND[text] || text).split(/\s+/);
    return parts.length === 5 ? parts : null;
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <div class="row">
      <input class="dbx-input mono" bind:value={input} placeholder="*/15 9-18 * * 1-5" spellcheck="false" />
      <button type="button" class="dbx-btn" onclick={refresh}>{c.now}</button>
    </div>
    {#if input.trim() && !cron}<p class="err">{c.invalid}</p>{/if}
    <div class="presets">
      {#each PRESETS as p}
        <button type="button" class="dbx-btn small" onclick={() => (input = p)}>{p}</button>
      {/each}
    </div>
  </div>

  {#if cron}
    <div class="dbx-card">
      <table class="dbx-table field-table">
        <thead><tr><th></th>{#each FIELD_ORDER as f}<th>{c[f]}</th>{/each}</tr></thead>
        <tbody><tr><td class="k">{c.fields}</td>{#each FIELD_ORDER as f, i}<td><code class="mono">{expandedExpr?.[i]}</code></td>{/each}</tr></tbody>
      </table>
      <p class="desc">{c.summary}: <b>{summary}</b></p>
    </div>

    <div class="dbx-card table-card">
      <h2 class="dbx-section-title">{c.nextRuns}</h2>
      {#if runs.length}
        <table class="dbx-table">
          <tbody>
            {#each runs as r, i}
              <tr>
                <td class="k">{i + 1}</td>
                <td><code>{fmt(r)}</code></td>
                <td class="dim">{r.toISOString()}</td>
                <td class="act"><CopyButton text={r.toISOString()} small /></td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <p class="err">{c.noRuns}</p>
      {/if}
    </div>
  {/if}
</ToolShell>

<style>
  .dbx-card { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
  .row { display: flex; gap: 10px; }
  .row .dbx-input { flex: 1; }
  .presets { display: flex; gap: 8px; flex-wrap: wrap; }
  .small { font-size: 12px; padding: 4px 10px; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .field-table th { text-align: center; }
  .field-table td { text-align: center; }
  .k { font-weight: 600; }
  .desc { margin: 0; font-size: 13px; }
  .dim { color: var(--color-text-secondary, #64748b); font-size: 12px; }
  .act { width: 60px; text-align: right; }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; margin: 0; }
</style>
