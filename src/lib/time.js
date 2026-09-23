// Timestamp ⇄ date conversion helpers. Pure functions for testability.

// Detects the unit of a bare integer timestamp by magnitude and returns
// milliseconds since epoch. Thresholds are unambiguous for 1970–2100+:
//   >= 1e17  nanoseconds   (now ≈ 1.7e18)
//   >= 1e14  microseconds  (now ≈ 1.7e15)
//   >= 1e11  milliseconds  (now ≈ 1.7e12)
//   else     seconds       (now ≈ 1.7e9)
export function parseTimestamp(text) {
  const bi = BigInt(text);
  const abs = bi < 0n ? -bi : bi;
  if (abs >= 10n ** 17n) return { ms: Number(bi / 1000000n), unit: "ns" };
  if (abs >= 10n ** 14n) return { ms: Number(bi / 1000n), unit: "us" };
  if (abs >= 10n ** 11n) return { ms: Number(bi), unit: "ms" };
  return { ms: Number(bi * 1000n), unit: "s" };
}

// Accepts an integer timestamp or a date string; returns { ms, unit } or null.
export function parseTimeInput(text) {
  const t = text.trim();
  if (!t) return null;
  if (/^[+-]?\d+$/.test(t)) return parseTimestamp(t);
  // Decimal timestamps are almost always seconds with a fractional part
  // (e.g. "1700000000.123"); treat them as such.
  if (/^[+-]?\d+\.\d+$/.test(t)) return { ms: Math.round(parseFloat(t) * 1000), unit: "s" };
  let ms = Date.parse(t);
  if (Number.isNaN(ms)) {
    // Date.parse is lenient-but-inconsistent for "YYYY-MM-DD HH:mm:ss"
    const m = t.match(
      /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2})(?:\.(\d{1,3}))?)?)?$/,
    );
    if (!m) return null;
    ms = new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0), +(m[7] || 0)).getTime();
  }
  return { ms, unit: "date" };
}

export function dayOfYear(d) {
  return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 1)) / 864e5) + 1;
}

// ISO-8601 week number and the year it belongs to (a Jan date can belong to
// the previous ISO year, e.g. 2021-01-01 → 2020-W53).
export function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (t.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  t.setUTCDate(t.getUTCDate() - day + 3); // Thursday of this week
  const firstThu = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  const fday = (firstThu.getUTCDay() + 6) % 7;
  firstThu.setUTCDate(firstThu.getUTCDate() - fday + 3);
  return { year: t.getUTCFullYear(), week: 1 + Math.round((t - firstThu) / 6048e5) };
}

export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function utcOffsetString(d) {
  const off = -d.getTimezoneOffset(); // minutes east of UTC
  const sign = off >= 0 ? "+" : "-";
  const h = Math.floor(Math.abs(off) / 60);
  const m = Math.abs(off) % 60;
  return `UTC${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ── Timezone conversion ────────────────────────────────────────────────
// All zone math goes through Intl — no bundled tz database.

export const TIMEZONES = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : ["UTC"];

// Shown first when the picker is open with an empty query.
export const COMMON_TIMEZONES = [
  "Asia/Shanghai",
  "UTC",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Asia/Dubai",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Australia/Sydney",
];

const dtfCache = new Map();
function zoneFormatter(tz) {
  let f = dtfCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    dtfCache.set(tz, f);
  }
  return f;
}

function zoneParts(ms, tz) {
  const p = {};
  for (const part of zoneFormatter(tz).formatToParts(new Date(ms))) {
    if (part.type !== "literal") p[part.type] = part.value;
  }
  return p;
}

// "2024-02-29 12:30:45" wall clock as shown in `tz` at instant ms.
export function wallInZone(ms, tz) {
  const p = zoneParts(ms, tz);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

// Zone offset in ms: (wall clock in tz, read as UTC) - instant.
export function tzOffsetMsAt(ms, tz) {
  const p = zoneParts(ms, tz);
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - ms;
}

export function tzOffsetLabelAt(ms, tz) {
  const off = Math.round(tzOffsetMsAt(ms, tz) / 60000);
  const sign = off >= 0 ? "+" : "-";
  const a = Math.abs(off);
  return `UTC${sign}${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}`;
}

// Wall-clock string interpreted in `tz` -> UTC instant. Converges in ≤2
// iterations; the second pass lands on the correct side of DST transitions.
export function zonedToUtc(wall, tz) {
  const m = String(wall)
    .trim()
    .match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (!m) return null;
  let guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
  for (let i = 0; i < 3; i++) {
    const off = tzOffsetMsAt(guess, tz);
    const fixed = guess - off;
    if (off === tzOffsetMsAt(fixed, tz)) return fixed;
    guess = fixed;
  }
  return guess;
}

export function isTimeZone(tz) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// Accepts IANA names plus whole-hour offsets — "+8", "-5", "UTC+8", "GMT-05"
// — mapped to Etc/GMT∓N (IANA's fixed-offset zones invert the sign).
export function resolveTimeZone(text) {
  const tz = String(text || "").trim();
  if (!tz) return null;
  if (isTimeZone(tz)) return tz;
  const m = tz.match(/^(?:(?:utc|gmt)\s*)?([+-])(\d{1,2})(?::?(\d{2}))?$/i);
  if (!m) return null;
  const h = +m[2];
  const min = +(m[3] || 0);
  if (h > 14 || min > 59) return null;
  if (min !== 0) {
    // ICU accepts zero-padded "+HH:MM" offsets directly — normalize to that.
    const norm = `${m[1]}${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    return isTimeZone(norm) ? norm : null;
  }
  if (h === 0) return "UTC";
  return `Etc/GMT${m[1] === "-" ? "+" : "-"}${h}`;
}

// Largest-unit relative time ("3 days ago"); Intl handles the localization.
export function relativeString(ms, now, locale) {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const diff = Math.round((ms - now) / 1000);
  const units = [
    ["year", 31556952], ["month", 2629746], ["week", 604800],
    ["day", 86400], ["hour", 3600], ["minute", 60], ["second", 1],
  ];
  for (const [unit, secs] of units) {
    if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
  }
  return rtf.format(0, "second");
}
