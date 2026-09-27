// JSON format / validate helpers. Pure functions for testability.

// Numbers keep their raw lexeme instead of going through Number — JSON.parse
// silently truncates integers beyond 2^53-1 (issue #2: 1968549762545291267
// came out as 1968549762545291300) and turns 1e400 into null. Emitting the
// original literal makes formatting lossless.
class RawNum {
  constructor(raw) {
    this.raw = raw;
  }
}

// A minimal recursive-descent parser. JSC's JSON.parse error messages carry
// no position, so locating the first syntax error by hand gives the user a
// line/column plus a snippet — and it builds the value tree in the same pass.
function parseJson(text) {
  let i = 0;
  const fail = (msg, pos = i) => ({ pos, msg });
  const ws = () => {
    while (i < text.length && " \t\n\r".includes(text[i])) i++;
  };
  const str = () => {
    const start = i;
    i++; // opening quote
    while (i < text.length) {
      const c = text[i];
      if (c === '"') return { v: JSON.parse(text.slice(start, ++i)) };
      if (c === "\n" || c === "\r") return fail("Unterminated string");
      if (c === "\\") {
        i++;
        if (i >= text.length) return fail("Unterminated escape");
        const e = text[i];
        if ("u" === e) {
          if (!/^[0-9a-fA-F]{4}$/.test(text.slice(i + 1, i + 5))) return fail("Invalid \\u escape");
          i += 5;
          continue;
        }
        if (!'"\\/bfnrt'.includes(e)) return fail(`Invalid escape '\\${e}'`);
        i++;
        continue;
      }
      const cp = c.codePointAt(0);
      if (cp < 0x20) return fail("Control character in string");
      i++;
    }
    return fail("Unterminated string");
  };
  const num = () => {
    const m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(text.slice(i));
    if (!m) return fail("Invalid number");
    i += m[0].length;
    return { v: new RawNum(m[0]) };
  };
  const lit = (word, val) => {
    if (!text.startsWith(word, i)) return fail(`Invalid literal (expected ${word})`);
    i += word.length;
    return { v: val };
  };
  const value = () => {
    ws();
    if (i >= text.length) return fail("Unexpected end of input");
    const c = text[i];
    if (c === "{") return obj();
    if (c === "[") return arr();
    if (c === '"') return str();
    if (c === "t") return lit("true", true);
    if (c === "f") return lit("false", false);
    if (c === "n") return lit("null", null);
    if (c === "-" || (c >= "0" && c <= "9")) return num();
    return fail(`Unexpected token '${c}'`);
  };
  const arr = () => {
    i++;
    ws();
    const out = [];
    if (text[i] === "]") return ++i, { v: out };
    while (true) {
      const r = value();
      if ("msg" in r) return r;
      out.push(r.v);
      ws();
      if (text[i] === ",") {
        i++;
        ws();
        if (text[i] === "]") return fail("Trailing comma in array");
        continue;
      }
      if (text[i] === "]") return ++i, { v: out };
      return fail(i >= text.length ? "Unexpected end of input (expected ',' or ']')" : `Expected ',' or ']', got '${text[i]}'`);
    }
  };
  const obj = () => {
    i++;
    ws();
    const out = {};
    if (text[i] === "}") return ++i, { v: out };
    while (true) {
      ws();
      if (text[i] !== '"') return fail(i >= text.length ? "Unexpected end of input (expected key)" : `Expected string key, got '${text[i]}'`);
      let r = str();
      if ("msg" in r) return r;
      const key = r.v;
      ws();
      if (text[i] !== ":") return fail(`Expected ':' after key`);
      i++;
      r = value();
      if ("msg" in r) return r;
      out[key] = r.v;
      ws();
      if (text[i] === ",") {
        i++;
        ws();
        if (text[i] === "}") return fail("Trailing comma in object");
        continue;
      }
      if (text[i] === "}") return ++i, { v: out };
      return fail(i >= text.length ? "Unexpected end of input (expected ',' or '}')" : `Expected ',' or '}', got '${text[i]}'`);
    }
  };
  const r = value();
  if ("msg" in r) return r;
  ws();
  if (i < text.length) return fail(`Unexpected trailing content '${text[i]}'`);
  return r;
}

export function jsonError(text) {
  const r = parseJson(text);
  return "msg" in r ? r : null;
}

export function posToLineCol(text, pos) {
  const before = text.slice(0, pos);
  const line = before.split("\n").length;
  const col = pos - before.lastIndexOf("\n");
  return { line, col };
}

function sortDeep(v) {
  if (v instanceof RawNum) return v;
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === "object") {
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = sortDeep(v[k]);
    return out;
  }
  return v;
}

function countStats(v, depth = 1, acc = { depth: 1, keys: 0, items: 0 }) {
  if (Array.isArray(v)) {
    acc.items += v.length;
    for (const x of v) countStats(x, depth + 1, acc);
  } else if (v && typeof v === "object" && !(v instanceof RawNum)) {
    const ks = Object.keys(v);
    acc.keys += ks.length;
    for (const k of ks) countStats(v[k], depth + 1, acc);
  }
  acc.depth = Math.max(acc.depth, depth);
  return acc;
}

// Serializer that emits RawNum literals verbatim; strings/keys go through
// JSON.stringify so escaping stays standard-compliant.
function emitJson(v, indent) {
  const min = indent === "min";
  const pad = typeof indent === "number" ? (lv) => " ".repeat(indent * lv) : (lv) => indent.repeat(lv);
  const walk = (v, lv) => {
    if (v instanceof RawNum) return v.raw;
    if (v === null || typeof v === "boolean") return String(v);
    if (typeof v === "string") return JSON.stringify(v);
    if (Array.isArray(v)) {
      if (!v.length) return "[]";
      const items = v.map((x) => walk(x, lv + 1));
      if (min) return `[${items.join(",")}]`;
      return `[\n${items.map((s) => pad(lv + 1) + s).join(",\n")}\n${pad(lv)}]`;
    }
    const ks = Object.keys(v);
    if (!ks.length) return "{}";
    const items = ks.map((k) => `${JSON.stringify(k)}${min ? ":" : ": "}${walk(v[k], lv + 1)}`);
    if (min) return `{${items.join(",")}}`;
    return `{\n${items.map((s) => pad(lv + 1) + s).join(",\n")}\n${pad(lv)}}`;
  };
  return walk(v, 0);
}

// indent: 2 | 4 | "tab" | "min"
export function formatJson(text, { indent = 2, sortKeys = false } = {}) {
  const r = parseJson(text);
  if ("msg" in r) {
    const { line, col } = posToLineCol(text, r.pos);
    const snippet = text.slice(Math.max(0, r.pos - 20), r.pos + 20);
    return { ok: false, error: { pos: r.pos, msg: r.msg, line, col, snippet } };
  }
  const data = sortKeys ? sortDeep(r.v) : r.v;
  const out = emitJson(data, indent === "tab" ? "\t" : indent);
  const stats = countStats(data);
  return { ok: true, output: out, stats };
}

// Splits JSON text into { t, v } tokens for syntax highlighting. Runs on
// already-validated output, so no error path is needed. Whitespace rides
// along in "plain" tokens to preserve indentation.
export function tokenizeJson(text) {
  const tokens = [];
  let i = 0;
  let buf = "";
  const flush = () => {
    if (buf) tokens.push({ t: "plain", v: buf });
    buf = "";
  };
  while (i < text.length) {
    const c = text[i];
    if (c === '"') {
      flush();
      let j = i + 1;
      while (j < text.length && text[j] !== '"') {
        if (text[j] === "\\") j++;
        j++;
      }
      const raw = text.slice(i, j + 1);
      // A string followed by ':' (after horizontal whitespace) is an object key.
      let k = j + 1;
      while (k < text.length && (text[k] === " " || text[k] === "\t")) k++;
      tokens.push({ t: text[k] === ":" ? "key" : "str", v: raw });
      i = j + 1;
    } else if (c === "-" || (c >= "0" && c <= "9")) {
      flush();
      const m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(text.slice(i));
      const raw = m ? m[0] : c;
      tokens.push({ t: "num", v: raw });
      i += raw.length;
    } else if (text.startsWith("true", i)) {
      flush();
      tokens.push({ t: "lit", v: "true" });
      i += 4;
    } else if (text.startsWith("false", i)) {
      flush();
      tokens.push({ t: "lit", v: "false" });
      i += 5;
    } else if (text.startsWith("null", i)) {
      flush();
      tokens.push({ t: "lit", v: "null" });
      i += 4;
    } else if ("{}[]:,".includes(c)) {
      flush();
      tokens.push({ t: "punct", v: c });
      i++;
    } else {
      buf += c;
      i++;
    }
  }
  flush();
  return tokens;
}
