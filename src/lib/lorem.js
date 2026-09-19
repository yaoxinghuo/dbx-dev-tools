// Dummy text generation for length-boundary testing. Pure functions.

import { generatePassword } from "./crypto.js";

const MAX = 1_000_000;
const ALNUM = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
// 千字文 excerpt: unique, common, single-codepoint hanzi.
const CJK_POOL = "天地玄黄宇宙洪荒日月盈昃辰宿列张寒来暑往秋收冬藏云腾致雨露结为霜金生丽水玉出昆冈";
const LOREM_WORDS =
  "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum"
    .split(" ");

function utf8Len(cp) {
  return cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
}

export function byteLength(text) {
  let n = 0;
  for (const ch of text) n += utf8Len(ch.codePointAt(0));
  return n;
}

// A lorem-ipsum stream with at least `minChars` code points. Punctuation is
// deterministic (comma every 7th word, period every 17th); words are random.
function loremStream(minChars) {
  const parts = ["Lorem", "ipsum", "dolor", "sit", "amet,"];
  let chars = 26;
  let wordCount = 5;
  while (chars < minChars) {
    let w = LOREM_WORDS[(Math.random() * LOREM_WORDS.length) | 0];
    if (wordCount % 17 === 0) w += ".";
    else if (wordCount % 7 === 0) w += ",";
    parts.push(w);
    chars += w.length + 1;
    wordCount++;
  }
  return parts.join(" ").replace(/\. ([a-z])/g, (_, c) => ". " + c.toUpperCase());
}

function patternStream(minChars, pattern) {
  const pat = [...(pattern || "0123456789")];
  if (!pat.length) pat.push("0");
  return pat.join("").repeat(Math.ceil(minChars / pat.length) + 1);
}

// Largest code-point-safe prefix of `text` that fits `nBytes`, topped up with
// single-byte "x" padding so the UTF-8 length is exactly nBytes.
function fitBytes(text, nBytes) {
  let acc = 0;
  let end = 0;
  for (const ch of text) {
    const b = utf8Len(ch.codePointAt(0));
    if (acc + b > nBytes) break;
    acc += b;
    end += ch.length;
  }
  return text.slice(0, end) + "x".repeat(nBytes - acc);
}

// unit "chars" counts code points; unit "bytes" targets exact UTF-8 length.
export function generate({ length = 0, unit = "chars", mode = "lorem", pattern = "" }) {
  const n = Math.min(Math.max(Math.floor(Number(length)) || 0, 0), MAX);
  if (!n) return { text: "", chars: 0, bytes: 0 };
  // n code points always carry at least n UTF-8 bytes, so n chars of raw
  // material is enough regardless of mode.
  let raw;
  if (mode === "alpha") raw = generatePassword(ALNUM, n);
  else if (mode === "cjk") raw = generatePassword(CJK_POOL, n);
  else if (mode === "pattern") raw = patternStream(n, pattern);
  else raw = loremStream(n);
  const text = unit === "bytes" ? fitBytes(raw, n) : [...raw].slice(0, n).join("");
  return { text, chars: [...text].length, bytes: byteLength(text) };
}
