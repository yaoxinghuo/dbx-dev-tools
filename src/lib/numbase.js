// Number base conversion via BigInt. Pure functions.

const NUM_RE = /^[+-]?(0[xX][0-9a-fA-F]+|0[oO][0-7]+|0[bB][01]+|\d+)$/;

// Parse "1234" / "0xFF" / "0o17" / "0b101" (BigInt handles the prefixes).
// Returns BigInt or null.
export function parseNumber(text) {
  const t = text.trim().replaceAll("_", "");
  if (!NUM_RE.test(t)) return null;
  try {
    return BigInt(t);
  } catch {
    return null;
  }
}

function bytesAsAscii(v) {
  const hex = v.toString(16);
  const padded = hex.length % 2 ? "0" + hex : hex;
  const bytes = padded.match(/../g).map((h) => parseInt(h, 16));
  return bytes.every((b) => b >= 0x20 && b < 0x7f)
    ? String.fromCharCode(...bytes)
    : null;
}

// Returns { dec, hex, oct, bin, ascii } or null when input is not a number.
export function baseConvert(text) {
  const v = parseNumber(text);
  if (v === null) return null;
  let ascii = null;
  if (v >= 0x20 && v < 0x7f) ascii = String.fromCharCode(Number(v));
  else if (v > 0x7f) ascii = bytesAsAscii(v);
  return {
    dec: v.toString(10),
    hex: (v < 0n ? "-0x" : "0x") + (v < 0n ? -v : v).toString(16),
    oct: (v < 0n ? "-0o" : "0o") + (v < 0n ? -v : v).toString(8),
    bin: (v < 0n ? "-0b" : "0b") + (v < 0n ? -v : v).toString(2),
    ascii,
  };
}
