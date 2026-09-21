// Escape / unescape for common formats. Pure functions for testability.

const HTML_NAMED = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const HTML_REVERSE = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0" };
// XML predefines only five entities; the apostrophe is &apos;, and named
// entities like &nbsp; are undefined (invalid) in XML.
const XML_NAMED = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
const XML_REVERSE = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function entityEscape(map) {
  return (text) => text.replace(/[&<>"']/g, (c) => map[c]);
}

function entityUnescape(reverseMap) {
  return (text) =>
    text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, body) => {
      if (body[0] === "#") {
        const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
        return Number.isFinite(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
      }
      return reverseMap[body.toLowerCase()] ?? whole;
    });
}

const htmlEscape = entityEscape(HTML_NAMED);
const htmlUnescape = entityUnescape(HTML_REVERSE);
const xmlEscape = entityEscape(XML_NAMED);
const xmlUnescape = entityUnescape(XML_REVERSE);

const JS_ESCAPES = { "\\": "\\\\", '"': '\\"', "'": "\\'", "\n": "\\n", "\r": "\\r", "\t": "\\t", "\b": "\\b", "\f": "\\f", "\v": "\\v", "\0": "\\0" };

function jsEscape(text) {
  return text.replace(/[\0-\x1f\\"']/g, (c) => JS_ESCAPES[c] ?? `\\u${c.codePointAt(0).toString(16).padStart(4, "0")}`);
}

function jsUnescape(text) {
  return text.replace(/\\(u\{([0-9a-fA-F]+)\}|u([0-9a-fA-F]{4})|x([0-9a-fA-F]{2})|(.))/g, (whole, _m, cp, u4, x2, ch) => {
    if (cp) return String.fromCodePoint(parseInt(cp, 16));
    if (u4) return String.fromCodePoint(parseInt(u4, 16));
    if (x2) return String.fromCharCode(parseInt(x2, 16));
    const simple = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", v: "\v", 0: "\0", "\\": "\\", '"': '"', "'": "'", "/": "/" };
    return simple[ch] ?? ch; // unknown escape: drop the backslash
  });
}

// JSON string escaping via JSON.stringify — strips the surrounding quotes so
// escaping is content-level: {"a":1} → {\"a\":1}.
function jsonEscape(text) {
  return JSON.stringify(text).slice(1, -1);
}

// Unescape accepts both a quoted JSON string literal ("{\"a\":1}") and bare
// escaped content ({\"a\":1}); bare input is wrapped in quotes for JSON.parse.
function jsonUnescape(text) {
  const t = text.trim();
  const candidate = t.startsWith('"') && t.endsWith('"') && t.length >= 2 ? t : `"${t}"`;
  try {
    return JSON.parse(candidate);
  } catch {
    // Raw control chars (e.g. a real newline) break strict JSON.parse — escape
    // them inside the literal and retry once.
    const inner = candidate.slice(1, -1).replace(/[\n\r\t]/g, (c) => ({ "\n": "\\n", "\r": "\\r", "\t": "\\t" })[c]);
    return JSON.parse(`"${inner}"`);
  }
}

const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;

function regexEscape(text) {
  return text.replace(REGEX_SPECIAL, "\\$&");
}

function regexUnescape(text) {
  return text.replace(/\\(.)/g, "$1");
}

function csvEscape(text) {
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csvUnescape(text) {
  return text.startsWith('"') && text.endsWith('"') && text.length >= 2
    ? text.slice(1, -1).replaceAll('""', '"')
    : text;
}

function shellEscape(text) {
  return `'${text.replaceAll("'", "'\\''")}'`;
}

function shellUnescape(text) {
  return text.startsWith("'") && text.endsWith("'") && text.length >= 2
    ? text.slice(1, -1).replaceAll("'\\''", "'")
    : text;
}

export const ESCAPE_FORMATS = {
  xml: { escape: xmlEscape, unescape: xmlUnescape },
  html: { escape: htmlEscape, unescape: htmlUnescape },
  js: { escape: jsEscape, unescape: jsUnescape },
  json: { escape: jsonEscape, unescape: jsonUnescape },
  regex: { escape: regexEscape, unescape: regexUnescape },
  csv: { escape: csvEscape, unescape: csvUnescape },
  shell: { escape: shellEscape, unescape: shellUnescape },
};
