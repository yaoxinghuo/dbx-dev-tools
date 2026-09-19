// Mojibake fixer: re-encode mis-decoded text back to bytes, decode as UTF-8.
// Browsers ship no GBK/Big5 encoder, so we build reverse maps by enumerating
// TextDecoder output once per charset (lazy, cached).

const WIN1252_HIGH = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
  0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
  0x017e: 0x9e, 0x0178: 0x9f,
};

// [leadLo, leadHi, trailRanges[]] per charset; null trail = single-byte extra range.
const CHARSETS = {
  "windows-1252": null,
  gbk: { leads: [[0x81, 0xfe]], trails: [[0x40, 0x7e], [0x80, 0xfe]], singles: [] },
  big5: { leads: [[0x81, 0xfe]], trails: [[0x40, 0x7e], [0xa1, 0xfe]], singles: [] },
  shift_jis: { leads: [[0x81, 0x9f], [0xe0, 0xfc]], trails: [[0x40, 0x7e], [0x80, 0xfc]], singles: [[0xa1, 0xdf]] },
};

const encoderCache = new Map();

function encoderFor(label) {
  if (encoderCache.has(label)) return encoderCache.get(label);
  const map = new Map();
  for (let b = 0; b < 0x80; b++) map.set(b, [b]);

  if (label === "windows-1252") {
    for (let b = 0xa0; b <= 0xff; b++) map.set(b, [b]);
    for (const [cp, b] of Object.entries(WIN1252_HIGH)) map.set(Number(cp), [b]);
  } else {
    const spec = CHARSETS[label];
    const dec = new TextDecoder(label);
    for (const [s, e] of spec.singles) {
      for (let b = s; b <= e; b++) {
        const c = dec.decode(Uint8Array.of(b));
        if (c.length === 1 && c !== "" && !map.has(c.codePointAt(0))) {
          map.set(c.codePointAt(0), [b]);
        }
      }
    }
    for (const [l1, l2] of spec.leads) {
      for (const [t1, t2] of spec.trails) {
        for (let b1 = l1; b1 <= l2; b1++) {
          for (let b2 = t1; b2 <= t2; b2++) {
            const c = dec.decode(Uint8Array.of(b1, b2));
            if (c.length === 1 && c !== "" && !map.has(c.codePointAt(0))) {
              map.set(c.codePointAt(0), [b1, b2]);
            }
          }
        }
      }
    }
  }
  encoderCache.set(label, map);
  return map;
}

// Encode text as `label` bytes; returns Uint8Array or null if a char is unrepresentable.
function encodeAs(text, map) {
  const out = [];
  for (const ch of text) {
    const bytes = map.get(ch.codePointAt(0));
    if (!bytes) return null;
    out.push(...bytes);
  }
  return Uint8Array.from(out);
}

function score(text) {
  let s = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp === 0xfffd) s -= 20;
    else if (cp < 0x20 && ch !== "\n" && ch !== "\t" && ch !== "\r") s -= 20;
    else if (cp >= 0x4e00 && cp <= 0x9fff) s += 3; // CJK unified
    else if ((cp >= 0x3000 && cp <= 0x303f) || (cp >= 0xff00 && cp <= 0xffef)) s += 2; // CJK punct/fullwidth
    else if (cp >= 0x3040 && cp <= 0x30ff) s += 3; // kana
    else if (cp >= 0xac00 && cp <= 0xd7af) s += 3; // hangul
    else if (cp >= 0x20 && cp < 0x7f) s += 0.5; // ASCII
  }
  return s;
}

// Returns candidate fixes sorted by likelihood: [{from, result, score}].
export function fixMojibake(text) {
  const cands = [];
  for (const label of Object.keys(CHARSETS)) {
    const bytes = encodeAs(text, encoderFor(label));
    if (!bytes) continue;
    let out;
    try {
      out = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      continue;
    }
    if (out === text) continue;
    cands.push({ from: label, result: out, score: score(out) });
  }
  cands.sort((a, b) => b.score - a.score);
  return cands;
}
