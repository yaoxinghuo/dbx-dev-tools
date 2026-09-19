<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { t, lang, onLangChange } from "../lib/i18n.js";
  import { parseTimeInput, dayOfYear, isoWeek, isLeapYear, utcOffsetString, relativeString } from "../lib/time.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.time);
  const u = $derived(s.time);

  let input = $state("");
  let error = $state("");
  let rows = $state([]);

  const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const WEEKDAYS_ZH = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

  function setNow() {
    input = String(Date.now());
  }

  $effect(() => {
    error = "";
    rows = [];
    const text = input;
    if (!text.trim()) return;
    const parsed = parseTimeInput(text);
    if (!parsed) {
      error = u.invalid;
      return;
    }
    const ms = parsed.ms;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) {
      error = u.outOfRange;
      return;
    }
    const week = isoWeek(d);
    const weekday = (lang() === "zh" ? WEEKDAYS_ZH : WEEKDAYS_EN)[d.getDay()];
    const unitLabel = u[`unit_${parsed.unit}`] || parsed.unit;
    rows = [
      [u.detected, `${text.trim()} → ${unitLabel}`],
      [u.unixSeconds, String(Math.floor(ms / 1000))],
      [u.unixMillis, String(ms)],
      [u.local, d.toString()],
      [u.utc, d.toUTCString()],
      [u.iso, d.toISOString()],
      [u.weekday, weekday],
      [u.doy, `${dayOfYear(d)} / ${isLeapYear(d.getFullYear()) ? 366 : 365}`],
      [u.isoWeek, `${week.year}-W${String(week.week).padStart(2, "0")}`],
      [u.leap, isLeapYear(d.getFullYear()) ? u.yes : u.no],
      [u.tz, utcOffsetString(d)],
      [u.relative, relativeString(ms, Date.now(), lang() === "zh" ? "zh" : "en")],
    ];
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <div class="opts">
      <button type="button" class="dbx-btn" onclick={setNow}>{u.now}</button>
    </div>
    <input class="dbx-input mono" bind:value={input} placeholder={u.placeholder} />
    {#if error}<p class="err">{error}</p>{/if}
  </div>

  {#if rows.length}
    <div class="dbx-card">
      <h2 class="dbx-section-title">{u.details}</h2>
      <table class="dbx-table">
        <tbody>
          {#each rows as [name, value]}
            <tr>
              <td class="k">{name}</td>
              <td class="v"><code>{value}</code></td>
              <td class="c"><CopyButton text={value} small /></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</ToolShell>

<style>
  .dbx-card { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
  .opts { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
  .k { white-space: nowrap; font-weight: 600; width: 160px; }
  .v code { overflow-wrap: anywhere; }
  .c { width: 60px; text-align: right; }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; margin: 0; }
</style>
