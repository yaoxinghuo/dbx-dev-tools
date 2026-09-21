// Standard 5-field crontab: minute hour dom month dow.
// Supports *, lists, ranges, steps, month/weekday names and @shorthands.
// Deliberately Vixie-cron semantics (dom/dow OR when both restricted).

const FIELD_DEFS = [
  { name: "minute", min: 0, max: 59 },
  { name: "hour", min: 0, max: 23 },
  { name: "dom", min: 1, max: 31 },
  { name: "month", min: 1, max: 12, names: { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 } },
  { name: "dow", min: 0, max: 7, names: { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }, wrap7: true },
];

const SHORTHANDS = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

function parsePart(part, def) {
  const step = part.includes("/") ? Number(part.split("/")[1]) : null;
  if (step !== null && (!Number.isInteger(step) || step <= 0)) return null;
  const body = step !== null ? part.split("/")[0] : part;
  let values = new Set();
  if (body === "*") {
    for (let v = def.min; v <= def.max; v++) values.add(def.wrap7 && v === 7 ? 0 : v);
  } else if (body.includes("-")) {
    const [rawA, rawB] = body.split("-");
    const a = parseValue(rawA, def);
    const b = parseValue(rawB, def);
    if (a === null || b === null || a > b) return null;
    for (let v = a; v <= b; v++) values.add(v);
  } else {
    const v = parseValue(body, def);
    if (v === null) return null;
    values.add(v);
  }
  if (step !== null) {
    const base = [...values];
    values = new Set(base.filter((_, i) => i % step === 0));
  }
  return values;
}

function parseValue(token, def) {
  const lower = token.toLowerCase();
  if (def.names && lower in def.names) return def.names[lower];
  if (!/^\d+$/.test(token)) return null;
  const v = Number(token);
  if (v < def.min || v > def.max) return null;
  // dow 7 == 0 (Sunday)
  return def.wrap7 && v === 7 ? 0 : v;
}

export function parseCron(expr) {
  const text = expr.trim().toLowerCase();
  if (!text) return null;
  const expanded = SHORTHANDS[text] || text;
  const parts = expanded.split(/\s+/);
  if (parts.length !== 5) return null;
  const fields = {};
  for (let i = 0; i < 5; i++) {
    const set = new Set();
    for (const part of parts[i].split(",")) {
      const parsed = parsePart(part, FIELD_DEFS[i]);
      if (!parsed || !parsed.size) return null;
      for (const v of parsed) set.add(v);
    }
    fields[FIELD_DEFS[i].name] = set;
  }
  return { fields, domRestricted: fields.dom.size < 31, dowRestricted: fields.dow.size < 7 };
}

function matches(d, cron) {
  const f = cron.fields;
  if (!f.minute.has(d.getMinutes())) return false;
  if (!f.hour.has(d.getHours())) return false;
  if (!f.month.has(d.getMonth() + 1)) return false;
  const domOk = f.dom.has(d.getDate());
  const dowOk = f.dow.has(d.getDay());
  // Both restricted → OR (Vixie); otherwise AND.
  if (cron.domRestricted && cron.dowRestricted) return domOk || dowOk;
  return domOk && dowOk;
}

// Brute-force minute stepping; capped at ~4 years so invalid combos fail fast.
export function nextRuns(cron, from = new Date(), count = 5) {
  const out = [];
  const d = new Date(from.getTime() + 60000 - (from.getTime() % 60000));
  d.setSeconds(0, 0);
  const limit = new Date(from.getTime() + 4 * 366 * 24 * 3600 * 1000);
  while (out.length < count && d <= limit) {
    if (matches(d, cron)) out.push(new Date(d.getTime()));
    d.setMinutes(d.getMinutes() + 1);
  }
  return out;
}

// Compact human summary — pragmatism over full grammar: each field renders
// as "every unit", "at N" or a sorted list, so common patterns stay readable.
export function describeCron(cron, lang = "en") {
  const zh = lang === "zh";
  const f = cron.fields;
  const labels = {
    minute: zh ? "分" : "minute",
    hour: zh ? "时" : "hour",
    dom: zh ? "日" : "day of month",
    month: zh ? "月" : "month",
    dow: zh ? "周" : "weekday",
  };
  const ranges = {
    minute: [0, 59],
    hour: [0, 23],
    dom: [1, 31],
    month: [1, 12],
    dow: [0, 6],
  };
  const parts = [];
  for (const name of ["minute", "hour", "dom", "month", "dow"]) {
    const set = f[name];
    const [min, max] = ranges[name];
    if (set.size === max - min + 1) continue; // unrestricted
    const values = [...set].sort((a, b) => a - b);
    parts.push(`${labels[name]}${values.length === 1 ? "=" + values[0] : ": " + values.join(", ")}`);
  }
  return parts.length ? parts.join("; ") : zh ? "每分钟" : "every minute";
}
