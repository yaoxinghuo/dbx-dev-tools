// Cron parsing: standard 5-field (Vixie), 6-field with a leading seconds
// field (Node/Spring), and 7-field Quartz (seconds + trailing year).
// Supports *, lists, ranges, steps, names, @shorthands, and the Quartz
// specials ?, L, LW, nW, nL, n#k. Zero dependencies.
//
// Semantics differ by flavor: Vixie treats restricted dom/dow as OR;
// Quartz (and Spring) treat them as AND, number weekdays 1-7 (Sun=1),
// and mark the unused day field with ?.

const FIELD_DEFS = {
  second: { min: 0, max: 59 },
  minute: { min: 0, max: 59 },
  hour: { min: 0, max: 23 },
  dom: { min: 1, max: 31 },
  month: { min: 1, max: 12, names: { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 } },
  dow: { min: 0, max: 7, names: { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }, wrap7: true },
  year: { min: 1970, max: 2199 },
};
// Order used when a seconds field is present (5-field input has neither).
const ORDER_S = ["second", "minute", "hour", "dom", "month", "dow", "year"];

const SHORTHANDS = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

function parseValue(token, def) {
  const lower = token.toLowerCase();
  if (def.names && lower in def.names) return def.names[lower];
  if (!/^\d+$/.test(token)) return null;
  const v = Number(token);
  if (v < def.min || v > def.max) return null;
  return def.wrap7 && v === 7 ? 0 : v;
}

// dow atom → JS getDay() value. Quartz numbers weekdays 1..7 with Sun=1.
function dowValue(token, def, quartz) {
  if (def.names && token.toLowerCase() in def.names) return def.names[token.toLowerCase()];
  const v = parseValue(token, { ...def, names: null, wrap7: false });
  if (v === null) return null;
  if (quartz) return v >= 1 && v <= 7 ? v - 1 : null;
  return v === 7 ? 0 : v;
}

function parsePart(part, def, quartz, isDow) {
  const step = part.includes("/") ? Number(part.split("/")[1]) : null;
  if (step !== null && (!Number.isInteger(step) || step <= 0)) return null;
  const body = step !== null ? part.split("/")[0] : part;
  const val = (t) => (isDow ? dowValue(t, def, quartz) : parseValue(t, def));
  let values = new Set();
  if (body === "*" || body === "?") {
    // quartz weekday numbering is 1-7 (Sun=1) — the whole range is 0-6 here.
    if (isDow && quartz) values = new Set([0, 1, 2, 3, 4, 5, 6]);
    else for (let v = def.min; v <= def.max; v++) values.add(def.wrap7 && v === 7 ? 0 : v);
  } else if (body.includes("-")) {
    const [rawA, rawB] = body.split("-");
    const a = val(rawA);
    const b = val(rawB);
    if (a === null || b === null || a > b) return null;
    for (let v = a; v <= b; v++) values.add(v);
  } else {
    const v = val(body);
    if (v === null) return null;
    values.add(v);
  }
  if (step !== null) {
    const base = [...values];
    values = new Set(base.filter((_, i) => i % step === 0));
  }
  return values;
}

// Quartz-only specials for dom/dow. Returned shape:
//   dom: { k: "L" } | { k: "Lm", n } | { k: "LW" } | { k: "NW", n }
//   dow: { k: "dL", n } | { k: "nth", n, k2 }
function parseSpecial(token, field) {
  const t = token.trim();
  if (field === "dom") {
    if (/^l$/i.test(t)) return { k: "L" };
    let m = /^l-(\d+)$/i.exec(t);
    if (m) return { k: "Lm", n: Number(m[1]) };
    if (/^lw$/i.test(t)) return { k: "LW" };
    m = /^(\d{1,2})w$/i.exec(t);
    if (m) return { k: "NW", n: Number(m[1]) };
    return null;
  }
  // dow — nL (last nth weekday), n#k (k-th nth weekday); names allowed.
  const dowNames = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  let m = /^([a-z0-9]+)(?:#(\d+)|l)$/i.exec(t);
  if (m) {
    let n = dowNames[m[1].toLowerCase()];
    if (n === undefined && /^\d+$/.test(m[1])) {
      const v = Number(m[1]);
      // quartz numbering (1-7) lands here; caller decides mapping.
      n = v;
    }
    if (n === undefined || n === null) return null;
    return m[2] ? { k: "nth", n, k2: Number(m[2]), numeric: /^\d+$/.test(m[1]) } : { k: "dL", n, numeric: /^\d+$/.test(m[1]) };
  }
  return null;
}

// flavor: "auto" | "std" (Vixie/Node numbering, OR semantics) | "quartz"
// (Quartz/Spring: 1-7 weekdays, AND semantics, ?/L/W/# specials).
export function parseCron(expr, flavor = "auto") {
  const text = expr.trim().toLowerCase();
  if (!text) return null;
  const expanded = SHORTHANDS[text] || text;
  const parts = expanded.split(/\s+/);
  if (parts.length < 5 || parts.length > 7) return null;
  // Quartz markers: ?, #, or the L/W specials that only exist in day fields.
  const quartzChars = /[?#]/.test(expanded) || /\b(?:\d{1,2}w|lw|l-\d+|l|\d+l|[a-z]{3}l)\b/i.test(expanded);
  const quartz = flavor === "quartz" || (flavor === "auto" && (parts.length === 7 || quartzChars));
  const hasSeconds = parts.length >= 6;
  const hasYear = parts.length === 7;

  const fields = {};
  let domSpecial = null;
  let dowSpecial = null;
  for (let i = 0; i < parts.length; i++) {
    const key = ORDER_S[i + (hasSeconds ? 0 : 1)]; // 5-field starts at minute
    const def = FIELD_DEFS[key];
    const token = parts[i];
    if (token === "?") { fields[key] = null; continue; } // quartz "unspecified"
    // quartz specials only live in the day fields
    if ((key === "dom" || key === "dow") && quartz) {
      const spec = parseSpecial(token, key);
      if (spec) {
        if (key === "dom") domSpecial = spec;
        else {
          // numeric quartz dow atoms in specials are 1-based too
          if (spec.numeric) spec.n = spec.n === 7 ? 6 : spec.n - 1;
          dowSpecial = spec;
        }
        fields[key] = null;
        continue;
      }
    }
    const set = new Set();
    let ok = true;
    for (const part of token.split(",")) {
      const parsed = parsePart(part, def, quartz, key === "dow");
      if (!parsed || !parsed.size) { ok = false; break; }
      for (const v of parsed) set.add(v);
    }
    if (!ok) return null;
    fields[key] = set;
  }
  return {
    fields,
    domSpecial,
    dowSpecial,
    hasSeconds,
    hasYear,
    quartz,
    domRestricted: domSpecial !== null || (fields.dom !== null && fields.dom !== undefined && fields.dom.size < 31),
    dowRestricted: dowSpecial !== null || (fields.dow !== null && fields.dow !== undefined && fields.dow.size < 7),
    expanded: parts,
  };
}

const lastDom = (y, m) => new Date(y, m, 0).getDate(); // m is 1-based

function nearestWeekday(y, m, n) {
  const end = lastDom(y, m);
  let d = Math.min(end, Math.max(1, n));
  const w = new Date(y, m - 1, d).getDay();
  if (w === 6) d += d === 1 ? 2 : -1;
  else if (w === 0) d += d === end ? -2 : 1;
  return d;
}

function lastWeekdayOfMonth(y, m) {
  return nearestWeekday(y, m, lastDom(y, m));
}

function domHit(d, cron) {
  if (cron.domSpecial) {
    const y = d.getFullYear(), m = d.getMonth() + 1;
    const s = cron.domSpecial;
    if (s.k === "L") return d.getDate() === lastDom(y, m);
    if (s.k === "Lm") return d.getDate() === lastDom(y, m) - s.n;
    if (s.k === "LW") return d.getDate() === lastWeekdayOfMonth(y, m);
    return d.getDate() === nearestWeekday(y, m, s.n);
  }
  const set = cron.fields.dom;
  return !set || set.has(d.getDate());
}

function dowHit(d, cron) {
  if (cron.dowSpecial) {
    const s = cron.dowSpecial;
    if (s.n !== d.getDay()) return false;
    if (s.k === "dL") {
      // last n-th weekday: same weekday next week would be next month
      const next = new Date(d.getTime() + 7 * 86400000);
      return next.getMonth() !== d.getMonth();
    }
    // k-th n-th weekday of the month
    return Math.floor((d.getDate() - 1) / 7) + 1 === s.k2;
  }
  const set = cron.fields.dow;
  return !set || set.has(d.getDay());
}

function minuteMatches(d, cron) {
  const f = cron.fields;
  if (f.minute && !f.minute.has(d.getMinutes())) return false;
  if (f.hour && !f.hour.has(d.getHours())) return false;
  if (f.month && !f.month.has(d.getMonth() + 1)) return false;
  if (f.year && !f.year.has(d.getFullYear())) return false;
  const domOk = domHit(d, cron);
  const dowOk = dowHit(d, cron);
  if (cron.quartz) return domOk && dowOk;
  if (cron.domRestricted && cron.dowRestricted) return domOk || dowOk;
  return domOk && dowOk;
}

// Iterate minute-wise and expand the seconds set inside matching minutes —
// stepping by second would be ~60x slower for sparse schedules.
export function nextRuns(cron, from = new Date(), count = 5) {
  const secs = cron.hasSeconds && cron.fields.second
    ? [...cron.fields.second].sort((a, b) => a - b)
    : [0];
  const out = [];
  const limit = from.getTime() + 4 * 366 * 86400000;
  let m = new Date(from.getTime());
  m.setSeconds(0, 0);
  while (out.length < count && m.getTime() <= limit) {
    if (minuteMatches(m, cron)) {
      for (const s of secs) {
        const cand = m.getTime() + s * 1000;
        if (cand > from.getTime()) out.push(new Date(cand));
        if (out.length === count) break;
      }
    }
    m.setTime(m.getTime() + 60000);
  }
  return out;
}

// Compact human summary; specials get their own phrasing.
export function describeCron(cron, lang = "en") {
  const zh = lang === "zh";
  const f = cron.fields;
  const labels = {
    second: zh ? "秒" : "sec",
    minute: zh ? "分" : "min",
    hour: zh ? "时" : "hour",
    dom: zh ? "日" : "day",
    month: zh ? "月" : "mon",
    dow: zh ? "周" : "weekday",
    year: zh ? "年" : "year",
  };
  const ranges = {
    second: [0, 59], minute: [0, 59], hour: [0, 23],
    dom: [1, 31], month: [1, 12], dow: [0, 6], year: [1970, 2199],
  };
  const WEEK = zh
    ? ["日", "一", "二", "三", "四", "五", "六"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const parts = [];
  const pushSpecial = (name, s) => {
    const L = {
      L: zh ? "最后一天" : "last day",
      Lm: zh ? `倒数第${s.n}天` : `${s.n} before last day`,
      LW: zh ? "最后一个工作日" : "last weekday",
      NW: zh ? `靠近${s.n}日的工作日` : `nearest weekday to ${s.n}`,
      dL: zh ? `最后一个周${WEEK[s.n]}` : `last ${WEEK[s.n]}`,
      nth: zh ? `第${s.k2}个周${WEEK[s.n]}` : `${s.k2}${["st", "nd", "rd", "th"][Math.min(s.k2, 4) - 1]} ${WEEK[s.n]}`,
    }[s.k];
    parts.push(`${labels[name]}=${L}`);
  };
  for (const name of ORDER_S) {
    if (name === "second" && !cron.hasSeconds) continue;
    if (name === "year" && !cron.hasYear) continue;
    const special = name === "dom" ? cron.domSpecial : name === "dow" ? cron.dowSpecial : null;
    if (special) { pushSpecial(name, special); continue; }
    const set = f[name];
    if (!set) continue; // ? — unspecified
    const [min, max] = ranges[name];
    if (set.size === max - min + 1) continue;
    const values = [...set].sort((a, b) => a - b);
    const shown = name === "dow" ? values.map((v) => WEEK[v]) : values;
    parts.push(`${labels[name]}${shown.length === 1 ? "=" + shown[0] : ": " + shown.join(", ")}`);
  }
  return parts.length ? parts.join("; ") : zh ? "每分钟" : "every minute";
}
