<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { t, lang, onLangChange } from "../lib/i18n.js";
  import { persistState } from "../lib/persist.svelte.js";
  import { parseTimeInput, dayOfYear, isoWeek, isLeapYear, utcOffsetString, relativeString } from "../lib/time.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.time);
  const u = $derived(s.time);

  let input = $state("");
  let error = $state("");
  let rows = $state([]);
  let mode = $state("timestamp"); // timestamp | duration

  const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const WEEKDAYS_ZH = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

  function setNow() {
    input = String(Date.now());
  }

  // Duration input: "90" (seconds), "3600000ms", "1h30m", "2d4h" …
  function parseDuration(text) {
    const t = text.trim().toLowerCase();
    if (!t) return null;
    if (/^\d+(\.\d+)?$/.test(t)) return { ms: Number(t) * 1000, unit: "s", raw: Number(t) };
    if (/^\d+(\.\d+)?(ms|s|m|h|d|w)$/.test(t)) {
      const mult = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 }[t.replace(/^\d+(\.\d+)?/, "")];
      return { ms: Number(t.replace(/[^\d.]/g, "")) * mult, unit: t.replace(/^\d+(\.\d+)?/, ""), raw: Number(t.replace(/[^\d.]/g, "")) };
    }
    if (/^(\d+(\.\d+)?(ms|s|m|h|d|w))+$/.test(t)) {
      let ms = 0;
      for (const [, num, unit] of t.matchAll(/(\d+(?:\.\d+)?)(ms|s|m|h|d|w)/g)) {
        ms += Number(num) * { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 }[unit];
      }
      return { ms, unit: null, raw: null };
    }
    return null;
  }

  function durationRows(ms) {
    const zh = lang() === "zh";
    const parts = [];
    const units = [
      [86400000, zh ? "天" : "d"],
      [3600000, zh ? "小时" : "h"],
      [60000, zh ? "分" : "m"],
      [1000, zh ? "秒" : "s"],
      [1, "ms"],
    ];
    let rest = ms;
    for (const [size, label] of units) {
      const value = Math.floor(rest / size);
      if (value > 0 || parts.length) {
        parts.push(`${value} ${label}`);
        rest -= value * size;
      }
    }
    const human = parts.filter((p) => !p.startsWith("0 ")).join(" ") || "0 ms";
    return [
      [u.millis, String(ms)],
      [u.seconds, String(ms / 1000)],
      [u.minutes, String(ms / 60000)],
      [u.hours, String(ms / 3600000)],
      [u.days, String(ms / 86400000)],
      [u.weeks, String(ms / 604800000)],
      [u.human, human],
    ];
  }

  $effect(() => {
    error = "";
    rows = [];
    const text = input;
    if (!text.trim()) return;
    if (mode === "duration") {
      const parsed = parseDuration(text);
      if (!parsed) {
        error = u.invalidDuration;
        return;
      }
      rows = durationRows(parsed.ms);
      return;
    }
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
  persistState("time", {
    get: () => ({ input, mode }),
    set: (v) => {
      input = v.input ?? input;
      mode = v.mode ?? mode;
    },
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <div class="opts">
      <label class="check"><input type="radio" bind:group={mode} value="timestamp" /> {u.tsMode}</label>
      <label class="check"><input type="radio" bind:group={mode} value="duration" /> {u.durMode}</label>
      {#if mode === "timestamp"}<button type="button" class="dbx-btn" onclick={setNow}>{u.now}</button>{/if}
    </div>
    <input class="dbx-input mono" bind:value={input} placeholder={mode === "timestamp" ? u.placeholder : u.durPlaceholder} />
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
