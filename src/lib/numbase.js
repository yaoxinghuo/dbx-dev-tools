// Number base conversion via BigInt. Pure functions.
// Every base field is editable in parallel; any-base (2-36) supported.

export const BASES = [
  { id: "dec", radix: 10, short: "DEC" },
  { id: "hex", radix: 16, short: "HEX" },
  { id: "oct", radix: 8, short: "OCT" },
  { id: "bin", radix: 2, short: "BIN" },
];
export const CUSTOM_ID = "custom";

export function clampRadix(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 2 && n <= 36 ? n : null;
}

const DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz";

// Parse text in a given radix; accepts 0x/0b/0o prefixes, separators and
// a leading minus. Returns BigInt or null.
export function parseBaseInteger(text, radix) {
  const r = clampRadix(radix);
  if (!r) return null;
  let raw = String(text ?? "").trim().replace(/[\s_]+/g, "");
  if (!raw) return null;
  const neg = raw.startsWith("-");
  if (neg) raw = raw.slice(1);
  if (r === 16) raw = raw.replace(/^0x/i, "");
  else if (r === 2) raw = raw.replace(/^0b/i, "");
  else if (r === 8) raw = raw.replace(/^0o/i, "");
  if (!raw) return null;
  const digits = raw.toLowerCase();
  const alphabet = DIGITS.slice(0, r);
  if (![...digits].every((ch) => alphabet.includes(ch))) return null;
  let n;
  if (r === 10) n = BigInt(digits);
  else if (r === 16) n = BigInt("0x" + digits);
  else if (r === 2) n = BigInt("0b" + digits);
  else if (r === 8) n = BigInt("0o" + digits);
  else {
    const base = BigInt(r);
    n = 0n;
    for (const ch of digits) n = n * base + BigInt(alphabet.indexOf(ch));
  }
  return neg ? -n : n;
}

function groupRight(text, size) {
  if (text.length <= size) return text;
  const parts = [];
  for (let i = text.length; i > 0; i -= size) parts.unshift(text.slice(Math.max(0, i - size), i));
  return parts.join(" ");
}

export function formatBaseInteger(value, radix, { group = false, prefix = false } = {}) {
  const r = clampRadix(radix);
  if (!r) return "";
  const sign = value < 0n ? "-" : "";
  const mag = value < 0n ? -value : value;
  let body = mag.toString(r);
  if (group) {
    const size = r === 2 ? 4 : r === 16 ? 2 : r === 10 || r === 8 ? 3 : 4;
    body = groupRight(body, size);
  }
  const pre = prefix ? { 16: "0x", 2: "0b", 8: "0o" }[r] ?? "" : "";
  return sign + pre + body;
}

// bits/bytes magnitude plus character interpretations — ASCII run for
// multi-byte values (0x48656c6c6f → "Hello"), codepoint otherwise.
export function describeInteger(value) {
  const mag = value < 0n ? -value : value;
  const bits = value === 0n ? 1 : mag.toString(2).length;
  const bytes = Math.max(1, Math.ceil(bits / 8));
  let code = "";
  let glyph = "";
  let ascii = null;
  if (value >= 0n && value <= 0x10ffffn) {
    const cp = Number(value);
    code = `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
    if (cp >= 32 && cp < 127) glyph = String.fromCharCode(cp);
    else if (cp > 127 && (cp < 0xd800 || cp > 0xdfff)) glyph = String.fromCodePoint(cp);
  }
  if (value > 0x7fn) {
    const hex = mag.toString(16).padStart(Math.ceil(bits / 8) * 2, "0");
    const bs = hex.match(/../g).map((h) => parseInt(h, 16));
    if (bs.every((b) => b >= 0x20 && b < 0x7f)) ascii = String.fromCharCode(...bs);
  }
  return { bits, bytes, code, glyph, ascii };
}
