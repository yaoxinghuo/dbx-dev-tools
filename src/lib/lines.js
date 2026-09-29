// Line-oriented text processing. Pure function — ops applied in a fixed
// pipeline order: text-level transforms first, then per-line cleanup,
// filters, ordering and decoration last.

const PUNCT_MAP = { ",": "，", ".": "。", "?": "？", "!": "！", ":": "：", ";": "；", "(": "（", ")": "）" };

// ASCII ↔ fullwidth: punctuation gets the mapped CJK form (。 instead of
// the plain fullwidth ．), everything else shifts by 0xFEE0; space ↔ 　.
function punctConvert(text, mode) {
  if (mode === "full") {
    return text.replace(/[!-~ ]/g, (ch) => {
      const c = ch.charCodeAt(0);
      if (c === 32) return "　";
      return PUNCT_MAP[ch] ?? String.fromCharCode(c + 0xfee0);
    });
  }
  const rev = Object.fromEntries(Object.entries(PUNCT_MAP).map(([a, b]) => [b, a]));
  return text.replace(/[　！-～。，？！：；（）]/g, (ch) => {
    if (ch === "　") return " ";
    if (rev[ch]) return rev[ch];
    return String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
  });
}

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const graphemeLen = (line) =>
  typeof Intl?.Segmenter === "function"
    ? [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(line)].length
    : [...line].length;

export function processLines(text, opts = {}) {
  const {
    find = "", replace = "", useRegex = false, ignoreCase = false,
    punct = "none",      // none | full | half
    tabs = "none",       // none | s2t | t2s
    trim = false, unnumber = false,
    colDelim = "", colIndex = 0, // colIndex is 1-based; 0/NaN = off
    lenMin = "", lenMax = "",
    removeEmpty = false, dedupe = false,
    sort = "none", reverse = false,
    number = false,
    affixMode = "none", affix = "",
  } = opts;

  // --- text level ---
  if (find) {
    try {
      const re = useRegex
        ? new RegExp(find, "gm" + (ignoreCase ? "i" : ""))
        : new RegExp(escRe(find), "g" + (ignoreCase ? "i" : ""));
      // literal mode: replacer fn keeps $ out of the replacement string
      text = useRegex ? text.replace(re, replace) : text.replace(re, () => replace);
    } catch { /* invalid regex → leave text unchanged */ }
  }
  if (punct !== "none") text = punctConvert(text, punct);
  if (tabs === "s2t") text = text.replace(/ {4}/g, "\t");
  else if (tabs === "t2s") text = text.replace(/\t/g, "    ");

  // --- line level ---
  let lines = text.split("\n");
  if (trim) lines = lines.map((l) => l.trim());
  if (unnumber) lines = lines.map((l) => l.replace(/^\s*\d+\s*(?:[.)、:：_-]\s*|\s+)/u, ""));
  const ci = Math.trunc(Number(colIndex));
  if (ci > 0) {
    lines = lines.map((l) => (colDelim ? l.split(colDelim) : l.trim().split(/\s+/))[ci - 1] ?? "");
  }
  if (removeEmpty) lines = lines.filter((l) => l.trim() !== "");
  // Number("") is 0, not NaN — check emptiness on the raw string instead.
  const min = lenMin === "" ? 0 : Math.max(0, Math.trunc(Number(lenMin)) || 0);
  const max = lenMax === "" ? Infinity : Math.max(0, Math.trunc(Number(lenMax)) || 0);
  if (min > 0 || max < Infinity) {
    lines = lines.filter((l) => { const n = graphemeLen(l); return n >= min && n <= max; });
  }
  if (dedupe) lines = [...new Set(lines)];
  if (sort === "asc") lines = [...lines].sort((a, b) => a.localeCompare(b));
  else if (sort === "desc") lines = [...lines].sort((a, b) => b.localeCompare(a));
  if (reverse) lines.reverse();
  if (number) {
    const pad = String(lines.length).length;
    lines = lines.map((l, i) => `${String(i + 1).padStart(pad, " ")}. ${l}`);
  }
  if (affixMode === "prefix") lines = lines.map((l) => affix + l);
  else if (affixMode === "suffix") lines = lines.map((l) => l + affix);
  return lines.join("\n");
}
