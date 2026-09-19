// Invisible character analyzer. Pure functions.

// cp -> {name, show} for chars worth flagging. Ranges expanded below.
const TABLE = new Map();
const add = (cp, name, show) => TABLE.set(cp, { name, show });

add(0x0000, "NULL", "[NUL]");
add(0x0009, "TAB", "\u21e5");
add(0x000a, "LF", "\u21b5");
add(0x000b, "VT", "[VT]");
add(0x000c, "FF", "[FF]");
add(0x000d, "CR", "[CR]");
add(0x0020, "SPACE", "\u00b7");
add(0x0085, "NEL", "[NEL]");
add(0x00a0, "NBSP", "[NBSP]");
add(0x00ad, "SOFT HYPHEN", "[SHY]");
add(0x061c, "ALM", "[ALM]");
add(0x115f, "HANGUL CHOSEONG FILLER", "[HCF]");
add(0x1160, "HANGUL JUNGSEONG FILLER", "[HJF]");
add(0x1680, "OGHAM SPACE", "[OGH]");
add(0x180e, "MONGOLIAN VOWEL SEP", "[MVS]");
for (let cp = 0x2000; cp <= 0x200a; cp++) add(cp, "SPACE", "[SP]");
add(0x200b, "ZERO WIDTH SPACE", "[ZWSP]");
add(0x200c, "ZERO WIDTH NON-JOINER", "[ZWNJ]");
add(0x200d, "ZERO WIDTH JOINER", "[ZWJ]");
add(0x200e, "LEFT-TO-RIGHT MARK", "[LRM]");
add(0x200f, "RIGHT-TO-LEFT MARK", "[RLM]");
add(0x2028, "LINE SEPARATOR", "[LS]");
add(0x2029, "PARAGRAPH SEPARATOR", "[PS]");
add(0x202a, "LRE", "[LRE]");
add(0x202b, "RLE", "[RLE]");
add(0x202c, "PDF", "[PDF]");
add(0x202d, "LRO", "[LRO]");
add(0x202e, "RLO", "[RLO]");
add(0x205f, "MEDIUM MATH SPACE", "[MMSP]");
add(0x2060, "WORD JOINER", "[WJ]");
for (let cp = 0x2061; cp <= 0x2064; cp++) add(cp, "INVISIBLE OP", "[INV]");
for (let cp = 0x2066; cp <= 0x2069; cp++) add(cp, "ISOLATE", "[ISO]");
for (let cp = 0x206a; cp <= 0x206f; cp++) add(cp, "DEPRECATED FORMAT", "[DEP]");
add(0x3000, "IDEOGRAPHIC SPACE", "[IDSP]");
add(0x3164, "HANGUL FILLER", "[HF]");
add(0xfeff, "BOM / ZWNBSP", "[BOM]");
add(0xffa0, "HALFWIDTH HANGUL FILLER", "[HWF]");

// Chars removed by clean(): zero-width/format chars that corrupt diffs and
// parsing. Ordinary whitespace (space/tab/LF/CR) is kept; NBSP & friends are
// converted to regular space instead of deleted.
const STRIP = new Set([
  0x0000, 0x000b, 0x000c, 0x0085, 0x00ad, 0x061c, 0x115f, 0x1160, 0x180e,
  0x200b, 0x200c, 0x200d, 0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d,
  0x202e, 0x2060, 0x2061, 0x2062, 0x2063, 0x2064, 0x2066, 0x2067, 0x2068,
  0x2069, 0x206a, 0x206b, 0x206c, 0x206d, 0x206e, 0x206f, 0x3164, 0xfeff,
  0xffa0,
]);
const SPACEISH = new Set([0x00a0, 0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200a, 0x205f, 0x3000]);

export function lookup(cp) {
  return TABLE.get(cp) || null;
}

// tokens: [{kind:"char",ch,info?} | {kind:"text",text}]
export function analyze(text) {
  const tokens = [];
  const counts = new Map(); // cp -> {name, count}
  let run = "";
  const flush = () => {
    if (run) tokens.push({ kind: "text", text: run });
    run = "";
  };
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    const info = TABLE.get(cp);
    if (info) {
      flush();
      tokens.push({ kind: "char", ch, cp, info });
      const cur = counts.get(cp);
      if (cur) cur.count++;
      else counts.set(cp, { name: info.name, count: 1 });
    } else {
      run += ch;
    }
  }
  flush();
  const summary = [...counts.entries()]
    .map(([cp, v]) => ({ cp, ...v }))
    .sort((a, b) => b.count - a.count);
  return { tokens, summary };
}

// Strip zero-width/format chars; normalize exotic spaces to ASCII space.
export function clean(text) {
  let out = "";
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (STRIP.has(cp)) continue;
    out += SPACEISH.has(cp) ? " " : ch;
  }
  return out;
}
