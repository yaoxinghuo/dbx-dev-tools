// Line-based nginx syntax highlighter — produces HTML spans, no parser.
// Token order in the alternation matters: quoted strings are matched before
// comments so a '#' inside quotes is never treated as a comment start, and
// punctuation before the word class so '}' alone isn't marked a directive.

const TOKEN = /("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|(#.*$)|([{};])|(\$[A-Za-z_][\w]*)|([^{};\s]+)/g;
const CLASS = ["", "nx-str", "nx-str", "nx-com", "nx-punc", "nx-var", "nx-dir"];

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function highlightNginxLine(line) {
  let html = "";
  let last = 0;
  let seenWord = false;
  for (const m of line.matchAll(TOKEN)) {
    html += esc(line.slice(last, m.index));
    last = m.index + m[0].length;
    let cls = "";
    for (let g = 1; g <= 6; g++) {
      if (m[g] !== undefined) {
        // Only the first bare word of a line is a directive name.
        cls = g === 6 && seenWord ? "" : CLASS[g];
        break;
      }
    }
    if (cls === "nx-dir") seenWord = true;
    html += cls ? `<span class="${cls}">${esc(m[0])}</span>` : esc(m[0]);
  }
  return html + esc(line.slice(last));
}

export function highlightNginx(text) {
  return text.split("\n").map(highlightNginxLine).join("\n");
}
