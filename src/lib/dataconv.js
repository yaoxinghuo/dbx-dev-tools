// Data interchange conversions: JSON ⇄ CSV/TSV/NDJSON/XML and JSON → YAML.
// Zero-dependency pure functions; XML parsing uses the native DOMParser.
// Deliberate subset: JSON-side is always real JSON; the other formats handle
// the flat/tabular shapes these tools are used for. YAML is emit-only (full
// YAML parsing needs a real parser — out of scope for a zero-dep tool).

import { isJsonNum, jsonNodeText } from "./json.js";

// Lossless-parse numbers arrive as RawNum wrappers — every emitter unwraps
// them through `lit` so `12345678901234567890` stays verbatim instead of
// serializing as {"raw": "…"}.
const lit = (v) => (isJsonNum(v) ? v.raw : v);

// ---------- CSV/TSV ----------

// RFC 4180 quoting; delimiter is one char ("," or "\t").
export function recordsToCsv(rows, delim = ",") {
  const cell = (v) => {
    if (v === null || v === undefined) return "";
    const s = isJsonNum(v) ? v.raw : typeof v === "object" ? jsonNodeText(v) : String(v);
    return /["\r\n]/.test(s) || s.includes(delim) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const lines = [cols.map(cell).join(delim)];
  for (const r of rows) lines.push(cols.map((c) => cell(r[c])).join(delim));
  return lines.join("\r\n");
}

export function csvToRecords(text, delim = ",") {
  // RFC 4180 state machine — handles quoted fields with embedded delim/CRLF/"".
  const rows = [];
  let row = [];
  let field = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === delim) { row.push(field); field = ""; }
    else if (ch === "\r") { /* swallowed; \n terminates */ }
    else if (ch === "\n") { row.push(field); field = ""; rows.push(row); row = []; }
    else field += ch;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];
  const head = rows[0];
  const data = rows.slice(1).filter((r) => r.length > 1 || r[0] !== "");
  return data.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

// ---------- NDJSON ----------

export function jsonToNdjson(value) {
  const arr = Array.isArray(value) ? value : [value];
  return arr.map((v) => jsonNodeText(v)).join("\n");
}

export function ndjsonToJson(text) {
  return text.split(/\r?\n/).filter((l) => l.trim()).map((l) => JSON.parse(l));
}

// ---------- XML ----------

const XML_ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const escXml = (s) => String(s).replace(/[&<>"]/g, (c) => XML_ESC[c]);
const tagName = (k) => (/^[A-Za-z_][\w.-]*$/.test(k) ? k : "item");

export function jsonToXml(value, rootName = "root") {
  const emit = (v, name, pad) => {
    if (Array.isArray(v)) {
      // A bare array under `name` expands to repeated <item> elements;
      // an array-valued property repeats the property tag.
      return v.map((x) => emit(x, name === tagName(rootName) ? "item" : name, pad)).join("");
    }
    if (v !== null && typeof v === "object" && !isJsonNum(v)) {
      const inner = Object.entries(v).map(([k, x]) => emit(x, tagName(k), pad + "  ")).join("");
      return `${pad}<${name}>\n${inner}${pad}</${name}>\n`;
    }
    return `${pad}<${name}>${v === null || v === undefined ? "" : escXml(lit(v))}</${name}>\n`;
  };
  const name = tagName(rootName);
  // XML needs exactly one root — wrap a top-level array in <root><item>…
  const body = Array.isArray(value)
    ? `<${name}>\n${value.map((x) => emit(x, "item", "  ")).join("")}</${name}>\n`
    : emit(value, name, "");
  return `<?xml version="1.0" encoding="UTF-8"?>\n${body}`;
}

export function xmlToJson(text) {
  const doc = new DOMParser().parseFromString(text, "text/xml");
  const err = doc.querySelector("parsererror");
  if (err) throw new Error("invalid XML");
  const toVal = (el) => {
    const kids = [...el.children];
    const text_ = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.nodeValue.trim())
      .join("");
    if (!kids.length) return text_;
    const obj = {};
    for (const k of kids) {
      const v = toVal(k);
      if (k.tagName in obj) {
        if (!Array.isArray(obj[k.tagName])) obj[k.tagName] = [obj[k.tagName]];
        obj[k.tagName].push(v);
      } else obj[k.tagName] = v;
    }
    return obj;
  };
  return { [doc.documentElement.tagName]: toVal(doc.documentElement) };
}

// ---------- JSON → YAML (emit subset) ----------

function yamlScalar(v) {
  // RawNum literals emit bare — they were JSON numbers, quoting would
  // silently turn them into YAML strings.
  if (isJsonNum(v)) return v.raw;
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean" || typeof v === "number") return String(v);
  const s = String(v);
  // Quote only when needed: YAML keywords, leading/trailing space, or chars
  // that start a construct (: [ ] { } # , & * ! | > ' " % @ ` - ?).
  if (s === "" || /^\s|\s$/.test(s) || /^(true|false|null|yes|no|on|off|~|[-]?\d|\.\d)/i.test(s) || /[:#\[\]{}&*!|>'"%@`,?]|^[-?]\s/.test(s)) {
    return JSON.stringify(s);
  }
  return s;
}

export function jsonToYaml(value) {
  const emit = (v, pad) => {
    if (Array.isArray(v)) {
      if (!v.length) return `${pad}[]\n`;
      return v.map((x) => {
        if (x !== null && typeof x === "object" && !isJsonNum(x)) {
          const inner = emit(x, pad + "  ");
          return `${pad}- ${inner.startsWith(pad + "  ") ? inner.slice(pad.length + 2) : inner}`;
        }
        return `${pad}- ${yamlScalar(x)}\n`;
      }).join("");
    }
    if (v !== null && typeof v === "object" && !isJsonNum(v)) {
      const keys = Object.keys(v);
      if (!keys.length) return `${pad}{}\n`;
      return keys.map((k) => {
        const x = v[k];
        if (x !== null && typeof x === "object" && !isJsonNum(x) && (Array.isArray(x) ? x.length : Object.keys(x).length)) {
          return `${pad}${k}:\n${emit(x, pad + "  ")}`;
        }
        return `${pad}${k}: ${yamlScalar(x)}\n`;
      }).join("");
    }
    return `${pad}${yamlScalar(v)}\n`;
  };
  return emit(value, "");
}

// ---------- JSONPath subset ----------
// Supports: $, .key, ["key"], .["key"], [0], [*], .*
// No filters/scripts/recursive descent — the 90% case of "pull a field".

export function jsonPath(root, expr) {
  const tokens = [];
  const re = /\.([A-Za-z_$][\w$-]*|\*)|\[\s*(?:"([^"]*)"|'([^']*)'|(\d+)|\*)\s*\]/g;
  let s = String(expr || "").trim();
  if (s.startsWith("$")) s = s.slice(1);
  // Accept `a.b[0]` shorthand by normalizing to `.a.b[0]`.
  if (s && !s.startsWith(".") && !s.startsWith("[")) s = "." + s;
  let m;
  let last = 0;
  while ((m = re.exec(s))) {
    if (m.index !== last && s[last] !== "") return { error: true }; // gaps = unsupported syntax
    tokens.push(m[1] ?? m[2] ?? m[3] ?? (m[4] !== undefined ? +m[4] : "*"));
    last = m.index + m[0].length;
  }
  if (last !== s.length) return { error: true };
  let cur = [root];
  for (const t of tokens) {
    const next = [];
    for (const v of cur) {
      if (t === "*") {
        if (Array.isArray(v)) next.push(...v);
        else if (v && typeof v === "object") next.push(...Object.values(v));
      } else if (v !== null && typeof v === "object" && t in v) next.push(v[t]);
    }
    cur = next;
  }
  return { values: cur };
}

// ---------- JSON → TypeScript ----------

function tsType(v, name, decls, seen) {
  if (isJsonNum(v)) return "number";
  if (v === null) return "null";
  if (Array.isArray(v)) {
    if (!v.length) return "unknown[]";
    const types = [...new Set(v.map((x) => tsType(x, name, decls, seen)))];
    const t = types.length === 1 ? types[0] : `(${types.join(" | ")})`;
    return /[| ]/.test(t) ? `${t}[]` : `${t}[]`;
  }
  if (typeof v === "object") {
    const fields = Object.entries(v).map(([k, x]) => {
      const key = /^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k);
      return `  ${key}: ${tsType(x, name + pascal(k), decls, seen)};`;
    });
    // Dedupe on the emitted body — same keys with different value types are
    // NOT the same shape, so keying on names alone would be wrong.
    const body = `{\n${fields.join("\n")}\n}`;
    if (seen.has(body)) return seen.get(body);
    seen.set(body, name);
    decls.push(`interface ${name} ${body}`);
    return name;
  }
  return typeof v;
}

function pascal(s) {
  const parts = String(s).split(/[^\w$]+|(?=[A-Z])/).filter(Boolean);
  const out = parts.map((w) => w[0].toUpperCase() + w.slice(1)).join("");
  return /^[A-Za-z_$]/.test(out) ? out || "Value" : "Value";
}

export function jsonToTs(value, rootName = "Root") {
  const decls = [];
  tsType(value, pascal(rootName) || "Root", decls, new Map());
  // Child interfaces were pushed during traversal — emit parents last so
  // the root interface lands on top.
  return [...decls].reverse().join("\n\n") + "\n";
}
