<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { t, onLangChange } from "../lib/i18n.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.datecalc);
  const dc = $derived(s.datecalc);

  let a = $state("");
  let b = $state("");
  let base = $state("");
  let amount = $state(7);
  let unit = $state("days"); // days | weeks | months

  function parse(v) {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function workingDays(d1, d2) {
    let [from, to] = d1 <= d2 ? [d1, d2] : [d2, d1];
    let count = 0;
    const cur = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
    let guard = 0;
    while (cur < end && guard++ < 40000) {
      cur.setDate(cur.getDate() + 1);
      const wd = cur.getDay();
      if (wd >= 1 && wd <= 5) count++;
    }
    return count;
  }

  const diff = $derived.by(() => {
    const d1 = parse(a);
    const d2 = parse(b);
    if (!d1 || !d2) return null;
    const ms = Math.abs(d2 - d1);
    const days = ms / 86400000;
    return {
      days,
      weeks: days / 7,
      months: days / 30.4375,
      years: days / 365.25,
      hours: ms / 3600000,
      minutes: ms / 60000,
      seconds: ms / 1000,
      working: workingDays(d1, d2),
    };
  });

  const added = $derived.by(() => {
    const d = parse(base);
    if (!d || !Number.isFinite(amount)) return null;
    const out = new Date(d);
    if (unit === "days") out.setDate(out.getDate() + amount);
    else if (unit === "weeks") out.setDate(out.getDate() + amount * 7);
    else out.setMonth(out.getMonth() + amount);
    return out;
  });

  const fmt = (v, digits = 2) => {
    const n = Math.round(v * 10 ** digits) / 10 ** digits;
    return Number.isInteger(n) ? String(n) : String(n);
  };
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <h2 class="dbx-section-title">{dc.diffTitle}</h2>
    <div class="row">
      <input type="datetime-local" class="dbx-input" bind:value={a} />
      <input type="datetime-local" class="dbx-input" bind:value={b} />
    </div>
    {#if diff}
      <table class="dbx-table">
        <tbody>
          <tr><td class="k">{dc.days}</td><td>{fmt(diff.days)}</td></tr>
          <tr><td class="k">{dc.weeks}</td><td>{fmt(diff.weeks)}</td></tr>
          <tr><td class="k">{dc.months}</td><td>{fmt(diff.months)}</td></tr>
          <tr><td class="k">{dc.years}</td><td>{fmt(diff.years)}</td></tr>
          <tr><td class="k">{dc.working}</td><td>{diff.working}</td></tr>
          <tr><td class="k">{dc.hours}</td><td>{fmt(diff.hours)}</td></tr>
          <tr><td class="k">{dc.minutes}</td><td>{fmt(diff.minutes)}</td></tr>
          <tr><td class="k">{dc.seconds}</td><td>{fmt(diff.seconds)}</td></tr>
        </tbody>
      </table>
    {/if}
  </div>

  <div class="dbx-card">
    <h2 class="dbx-section-title">{dc.addTitle}</h2>
    <div class="row">
      <input type="datetime-local" class="dbx-input" bind:value={base} />
      <input type="number" class="dbx-input narrow" bind:value={amount} />
      <select class="dbx-input narrow" bind:value={unit}>
        <option value="days">{dc.days}</option>
        <option value="weeks">{dc.weeks}</option>
        <option value="months">{dc.months}</option>
      </select>
    </div>
    {#if added}
      <div class="result">
        <code class="mono">{added.toLocaleString()}</code>
        <code class="mono iso">{added.toISOString()}</code>
        <CopyButton text={added.toISOString()} small />
      </div>
    {/if}
  </div>
</ToolShell>

<style>
  .dbx-card { display: flex; flex-direction: column; gap: 12px; margin-bottom: 14px; }
  .row { display: flex; gap: 10px; flex-wrap: wrap; }
  .row .dbx-input { flex: 1; min-width: 140px; }
  .row .narrow { flex: none; width: 110px; }
  .k { white-space: nowrap; font-weight: 600; width: 140px; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
  .result { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .iso { color: var(--color-text-secondary, #64748b); }
</style>
