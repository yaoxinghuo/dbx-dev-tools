// Text statistics. Pure functions for testability.

const CJK = /[一-鿿㐀-䶿豈-﫿]/g;

function countMatches(text, regex) {
  return (text.match(regex) || []).length;
}

// Words follow the usual counter convention: each CJK character is one word,
// Latin runs like "don't" or "foo-bar" are word tokens.
export function textStats(text) {
  const chars = [...text].length;
  const noSpace = [...text.replaceAll(/\s/g, "")].length;
  const cjk = countMatches(text, CJK);
  const latin = countMatches(text.replaceAll(CJK, " "), /[\p{L}\p{N}_'-]*[\p{L}\p{N}][\p{L}\p{N}_'-]*/gu);
  const words = latin + cjk;
  const letters = countMatches(text, /\p{L}/gu);
  const digits = countMatches(text, /\p{N}/gu);
  const punctuation = countMatches(text, /\p{P}/gu);
  const spaces = countMatches(text, /\s/g);
  const lines = text ? text.split(/\r\n|\r|\n/).length : 0;
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length;
  const sentences = countMatches(text, /[^.!?。！？…\s][^.!?。！？…]*(?:[.!?。！？…]+|$)/g);
  const bytes = new TextEncoder().encode(text).length;
  // Rough reading time: Latin ~200 wpm, CJK ~300 chars/min.
  const minutes = latin / 200 + cjk / 300;
  return { chars, noSpace, words, cjk, letters, digits, punctuation, spaces, lines, paragraphs, sentences, bytes, minutes };
}
