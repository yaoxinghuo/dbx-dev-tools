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
