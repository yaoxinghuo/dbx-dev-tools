// JSON format / validate helpers. Pure functions for testability.

// A minimal recursive-descent JSON parser used only for error reporting.
// JSC's JSON.parse error messages carry no position, so locating the first
// syntax error by hand gives the user a line/column plus a snippet.
export function jsonError(text) {
  let i = 0;
  const fail = (msg, pos = i) => ({ pos, msg });
  const ws = () => {
    while (i < text.length && " \t\n\r".includes(text[i])) i++;
  };
  const str = () => {
    i++; // opening quote
    while (i < text.length) {
      const c = text[i];
      if (c === '"') return ++i, null;
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
    return null;
  };
  const lit = (word) => {
    if (!text.startsWith(word, i)) return fail(`Invalid literal (expected ${word})`);
    i += word.length;
    return null;
  };
  const value = () => {
    ws();
    if (i >= text.length) return fail("Unexpected end of input");
    const c = text[i];
    if (c === "{") return obj();
    if (c === "[") return arr();
    if (c === '"') return str();
    if (c === "t") return lit("true");
    if (c === "f") return lit("false");
    if (c === "n") return lit("null");
    if (c === "-" || (c >= "0" && c <= "9")) return num();
    return fail(`Unexpected token '${c}'`);
  };
  const arr = () => {
    i++;
    ws();
    if (text[i] === "]") return ++i, null;
    while (true) {
      const e = value();
      if (e) return e;
      ws();
      if (text[i] === ",") {
        i++;
        ws();
        if (text[i] === "]") return fail("Trailing comma in array");
        continue;
      }
      if (text[i] === "]") return ++i, null;
      return fail(i >= text.length ? "Unexpected end of input (expected ',' or ']')" : `Expected ',' or ']', got '${text[i]}'`);
    }
  };
  const obj = () => {
    i++;
    ws();
    if (text[i] === "}") return ++i, null;
    while (true) {
      ws();
      if (text[i] !== '"') return fail(i >= text.length ? "Unexpected end of input (expected key)" : `Expected string key, got '${text[i]}'`);
      let e = str();
      if (e) return e;
      ws();
      if (text[i] !== ":") return fail(`Expected ':' after key`);
      i++;
      e = value();
      if (e) return e;
      ws();
      if (text[i] === ",") {
        i++;
        ws();
        if (text[i] === "}") return fail("Trailing comma in object");
        continue;
      }
      if (text[i] === "}") return ++i, null;
      return fail(i >= text.length ? "Unexpected end of input (expected ',' or '}')" : `Expected ',' or '}', got '${text[i]}'`);
    }
  };
  const e = value();
  if (e) return e;
  ws();
  if (i < text.length) return fail(`Unexpected trailing content '${text[i]}'`);
  return null;
}

export function posToLineCol(text, pos) {
  const before = text.slice(0, pos);
  const line = before.split("\n").length;
  const col = pos - before.lastIndexOf("\n");
  return { line, col };
}

function sortDeep(v) {
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
  } else if (v && typeof v === "object") {
    const ks = Object.keys(v);
    acc.keys += ks.length;
    for (const k of ks) countStats(v[k], depth + 1, acc);
  }
  acc.depth = Math.max(acc.depth, depth);
  return acc;
}

// indent: 2 | 4 | "tab" | "min"
export function formatJson(text, { indent = 2, sortKeys = false } = {}) {
  const err = jsonError(text);
  if (err) {
    const { line, col } = posToLineCol(text, err.pos);
    const snippet = text.slice(Math.max(0, err.pos - 20), err.pos + 20);
    return { ok: false, error: { ...err, line, col, snippet } };
  }
  const data = JSON.parse(text);
  const out = indent === "min"
    ? JSON.stringify(sortKeys ? sortDeep(data) : data)
    : JSON.stringify(sortKeys ? sortDeep(data) : data, null, indent === "tab" ? "\t" : indent);
  const stats = countStats(data);
  return { ok: true, output: out, stats };
}
