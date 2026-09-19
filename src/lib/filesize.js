// Byte size ⇄ human-readable conversion. Pure functions for testability.

const IEC = [["B", 1], ["KiB", 1024], ["MiB", 1024 ** 2], ["GiB", 1024 ** 3], ["TiB", 1024 ** 4], ["PiB", 1024 ** 5]];
const SI = [["B", 1], ["KB", 1e3], ["MB", 1e6], ["GB", 1e9], ["TB", 1e12], ["PB", 1e15]];
const UNIT_MAP = {
  b: 1, byte: 1, bytes: 1,
  kb: 1e3, mb: 1e6, gb: 1e9, tb: 1e12, pb: 1e15,
  kib: 1024, mib: 1024 ** 2, gib: 1024 ** 3, tib: 1024 ** 4, pib: 1024 ** 5,
  // Bare letters ("10M", "1.5G") follow the SI convention used by most tools.
  k: 1e3, m: 1e6, g: 1e9, t: 1e12, p: 1e15,
};

// Parses "1048576", "1.5 GB", "2 GiB" into a byte count. A bare number is
// treated as bytes. Returns null on malformed input.
export function parseSize(text) {
  const m = text.trim().match(/^([\d.,]+)\s*([a-zA-Z]*)$/);
  if (!m) return null;
  const value = parseFloat(m[1].replaceAll(",", ""));
  if (!Number.isFinite(value) || value < 0) return null;
  const unit = (m[2] || "b").toLowerCase();
  const mult = UNIT_MAP[unit];
  if (!mult) return null;
  const family = ["kb", "mb", "gb", "tb", "pb", "k", "m", "g", "t", "p"].includes(unit) ? "si" : "iec";
  return { bytes: value * mult, family };
}

function trimNum(n) {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/\.?0+$/, "");
}

// Picks the largest unit that keeps the value >= 1.
export function formatSize(bytes, units) {
  const abs = Math.abs(bytes);
  let chosen = units[0];
  for (const u of units) if (abs >= u[1]) chosen = u;
  return `${trimNum(bytes / chosen[1])} ${chosen[0]}`;
}

export const IEC_UNITS = IEC;
export const SI_UNITS = SI;

// Both conversion tables: [[unit, valueString], ...] for each family.
export function sizeTable(bytes, units) {
  return units.map(([name, mult]) => [name, trimNum(bytes / mult)]);
}
