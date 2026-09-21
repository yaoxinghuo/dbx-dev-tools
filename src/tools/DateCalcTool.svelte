<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { t, onLangChange } from "../lib/i18n.js";
  import { persistState } from "../lib/persist.svelte.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.datecalc);
  const dc = $derived(s.datecalc);

  let a = $state("");
  let b = $state("");
  let base = $state("");
  let amount = $state(7);
  let unit = $state("days"); // days | weeks | months

  // WKWebView's datetime-local picker is clumsy for the time part, so inputs
  // are plain text: yyyy-MM-dd[ HH:mm[:ss]] (-, /, . or T separators accepted).
  function parse(v) {
    if (!v) return null;
    const m = v.trim().match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T ](\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?$/);
    if (!m) return null;
    const [, y, mo, d, h = "0", mi = "0", sec = "0"] = m;
    const dt = new Date(+y, +mo - 1, +d, +h, +mi, +sec);
    return dt.getFullYear() === +y && dt.getMonth() === +mo - 1 && dt.getDate() === +d && +h < 24 && +mi < 60 && +sec < 60 ? dt : null;
  }

  const p2 = (n) => String(n).padStart(2, "0");
  const fmtLocal = (d) =>
    `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
  const now = () => fmtLocal(new Date());

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
  persistState("datecalc", {
    get: () => ({ a, b, base, amount, unit }),
    set: (v) => {
      a = v.a ?? a;
      b = v.b ?? b;
      base = v.base ?? base;
      amount = v.amount ?? amount;
      unit = v.unit ?? unit;
    },
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <h2 class="dbx-section-title">{dc.diffTitle}</h2>
    <div class="row">
      <input type="text" class="dbx-input mono" bind:value={a} placeholder={dc.placeholder} />
      <button type="button" class="dbx-btn now-btn" onclick={() => (a = now())}>{dc.now}</button>
    </div>
    <div class="row">
      <input type="text" class="dbx-input mono" bind:value={b} placeholder={dc.placeholder} />
      <button type="button" class="dbx-btn now-btn" onclick={() => (b = now())}>{dc.now}</button>
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
      <input type="text" class="dbx-input mono" bind:value={base} placeholder={dc.placeholder} />
      <button type="button" class="dbx-btn now-btn" onclick={() => (base = now())}>{dc.now}</button>
      <input type="number" class="dbx-input narrow" bind:value={amount} />
      <select class="dbx-input narrow" bind:value={unit}>
        <option value="days">{dc.days}</option>
        <option value="weeks">{dc.weeks}</option>
        <option value="months">{dc.months}</option>
      </select>
    </div>
    {#if added}
      <div class="result">
        <code class="mono">{fmtLocal(added)}</code>
        <code class="mono iso">{added.toISOString()}</code>
        <CopyButton text={fmtLocal(added)} small />
      </div>
    {/if}
  </div>
</ToolShell>

<style>
  .dbx-card { display: flex; flex-direction: column; gap: 12px; margin-bottom: 14px; }
  .row { display: flex; gap: 10px; flex-wrap: wrap; }
  .row .dbx-input { flex: 1; min-width: 140px; }
  .row .narrow { flex: none; width: 110px; }
  .now-btn { flex: none; }
  .k { white-space: nowrap; font-weight: 600; width: 140px; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
  .result { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .iso { color: var(--color-text-secondary, #64748b); }
</style>
