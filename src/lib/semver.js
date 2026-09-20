// Semantic Versioning 2.0.0 — parse, compare, sort.
// https://semver.org — build metadata ignored in precedence.

const RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*)?$/;

// -> { major, minor, patch, pre: [identifiers], raw } | null
export function parseSemver(v) {
  const m = typeof v === "string" ? v.trim().match(RE) : null;
  if (!m) return null;
  return {
    major: +m[1],
    minor: +m[2],
    patch: +m[3],
    pre: m[4] ? m[4].split(".") : [],
    raw: v.trim(),
  };
}

// Compare two prerelease identifier lists per spec §11.4.
function comparePre(a, b) {
  if (!a.length && !b.length) return 0;
  if (!a.length) return 1; // release > prerelease
  if (!b.length) return -1;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (i >= a.length) return -1; // shorter set wins when prefix-equal
    if (i >= b.length) return 1;
    const x = a[i];
    const y = b[i];
    if (x === y) continue;
    const nx = /^\d+$/.test(x);
    const ny = /^\d+$/.test(y);
    if (nx && ny) return +x < +y ? -1 : 1; // numeric identifiers compare numerically
    if (nx !== ny) return nx ? -1 : 1; // numeric < alphanumeric
    return x < y ? -1 : 1;
  }
  return 0;
}

// -> -1 | 0 | 1; either side may be raw string or parsed object
export function compareSemver(a, b) {
  const pa = typeof a === "string" ? parseSemver(a) : a;
  const pb = typeof b === "string" ? parseSemver(b) : b;
  if (!pa || !pb) return null;
  if (pa.major !== pb.major) return pa.major < pb.major ? -1 : 1;
  if (pa.minor !== pb.minor) return pa.minor < pb.minor ? -1 : 1;
  if (pa.patch !== pb.patch) return pa.patch < pb.patch ? -1 : 1;
  return comparePre(pa.pre, pb.pre);
}

// Sort a newline/space separated list -> { valid: [...], invalid: [...] }
export function sortSemvers(text, { desc = false, unique = false } = {}) {
  const items = text.split(/[\s,]+/).filter(Boolean);
  const parsed = items.map((v) => ({ raw: v, s: parseSemver(v) }));
  const invalid = parsed.filter((p) => !p.s).map((p) => p.raw);
  let valid = parsed.filter((p) => p.s).sort((x, y) => compareSemver(x.s, y.s)).map((p) => p.raw);
  if (unique) valid = [...new Set(valid)];
  if (desc) valid.reverse();
  return { valid, invalid };
}
