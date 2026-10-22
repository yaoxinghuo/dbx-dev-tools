<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { parseCron, nextRuns, describeCron } from "../lib/cron.js";
  import { t, lang, onLangChange } from "../lib/i18n.js";
  import { persistState } from "../lib/persist.svelte.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.cron);
  const c = $derived(s.cron);

  let input = $state("*/15 9-18 * * 1-5");
  let flavor = $state("auto"); // "auto" | "std" | "quartz"
  let now = $state(Date.now());
  let count = $state(5);

  const PRESETS = [
    "*/5 * * * *",
    "0 9 * * 1-5",
    "30 3 1 * *",
    "0 */10 * * * *",
    "0 0 9 * * ?",
    "0 0 0 L * ?",
    "0 0 12 ? * 6#3",
  ];

  const cron = $derived(input.trim() ? parseCron(input, flavor) : undefined);
  const summary = $derived(cron ? describeCron(cron, lang() === "zh" ? "zh" : "en") : "");
  // Clamp rather than reject: a stray 0/999 mid-typing shouldn't error out.
  const runCount = $derived(Math.min(100, Math.max(1, Math.floor(count) || 5)));
  const runs = $derived(cron ? nextRuns(cron, new Date(now), runCount) : []);

  function refresh() {
    now = Date.now();
  }

  const fmt = (d) =>
    d.toLocaleString(lang() === "zh" ? "zh-CN" : "en-US", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short",
    });
  const FIELD_ORDER = ["second", "minute", "hour", "dom", "month", "dow", "year"];
  const fieldCols = $derived(cron
    ? FIELD_ORDER.filter((f) => (f === "second" ? cron.hasSeconds : f === "year" ? cron.hasYear : true))
    : []);
  // expanded tokens align with visible columns (5-field input has no second/year)
  const expandedExpr = $derived(cron ? cron.expanded : null);
  persistState("cron", {
    get: () => ({ input, flavor, count }),
    set: (v) => {
      input = v.input ?? input;
      flavor = v.flavor ?? flavor;
      count = v.count ?? count;
    },
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <div class="row">
      <input class="dbx-input mono" bind:value={input} placeholder="*/15 9-18 * * 1-5" spellcheck="false" />
      <select class="dbx-input narrow" bind:value={flavor} title={c.flavor}>
        <option value="auto">{c.flavorAuto}</option>
        <option value="std">{c.flavorStd}</option>
        <option value="quartz">{c.flavorQuartz}</option>
      </select>
      <button type="button" class="dbx-btn" onclick={refresh}>{c.now}</button>
    </div>
    {#if cron}<p class="hint">{cron.quartz ? c.quartzNote : c.stdNote}</p>{/if}
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
        <thead><tr><th></th>{#each fieldCols as f}<th>{c[f]}</th>{/each}</tr></thead>
        <tbody><tr><td class="k">{c.fields}</td>{#each fieldCols as f, i}<td><code class="mono">{expandedExpr?.[i]}</code></td>{/each}</tr></tbody>
      </table>
      <p class="desc">{c.summary}: <b>{summary}</b></p>
    </div>

    <div class="dbx-card table-card">
      <h2 class="dbx-section-title runs-head">
        {c.nextRuns}
        <input class="dbx-input count" type="number" min="1" max="100" bind:value={count} />
        {c.runsUnit}
      </h2>
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
  .row .narrow { flex: none; width: 170px; }
  .presets { display: flex; gap: 8px; flex-wrap: wrap; }
  .small { font-size: 12px; padding: 4px 10px; }
  .hint { margin: 0; font-size: 12px; color: var(--color-text-secondary, #64748b); }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .field-table th { text-align: center; }
  .field-table td { text-align: center; }
  .k { font-weight: 600; }
  .desc { margin: 0; font-size: 13px; }
  .runs-head { display: flex; align-items: center; gap: 8px; }
  .count { width: 64px; text-align: center; padding: 2px 6px; font-size: 12px; }
  .dim { color: var(--color-text-secondary, #64748b); font-size: 12px; }
  .act { width: 60px; text-align: right; }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; margin: 0; }
</style>
