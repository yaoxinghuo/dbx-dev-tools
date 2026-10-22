// Syntax highlighting for XML and YAML — regex tokenizers that emit HTML
// spans. Shared palette classes (nx-*) match the Nginx highlighter so both
// tools render identically.

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const span = (cls, s) => `<span class="${cls}">${esc(s)}</span>`;

// ---------- XML ----------

const XTOK = /(<!--[\s\S]*?-->)|(<!\[CDATA\[[\s\S]*?\]\]>)|(<\?[\s\S]*?\?>)|(<!DOCTYPE[\s\S]*?>)|(<[^>]+>)|([^<]+)/g;

function hlTag(tag) {
  let out = "";
  const open = tag.match(/^<(\/?)/);
  out += span("nx-punc", open[0]);
  let i = open[0].length;
  const name = tag.slice(i).match(/^[A-Za-z_][\w:.-]*/);
  if (name) {
    out += span("nx-dir", name[0]);
    i += name[0].length;
  }
  const inner = tag.slice(i);
  const re = /("[^"]*")|('[^']*')|(\/?>$)/g;
  let last = 0;
  for (const m of inner.matchAll(re)) {
    out += esc(inner.slice(last, m.index));
    last = m.index + m[0].length;
    out += m[3] ? span("nx-punc", m[0]) : span("nx-str", m[0]);
  }
  return out + esc(inner.slice(last));
}

export function highlightXml(text) {
  let html = "";
  let last = 0;
  for (const m of text.matchAll(XTOK)) {
    html += esc(text.slice(last, m.index));
    last = m.index + m[0].length;
    if (m[1]) html += span("nx-com", m[0]);
    else if (m[2]) html += span("nx-str", m[0]);
    else if (m[3]) html += span("nx-punc", m[0]);
    else if (m[4]) html += span("nx-punc", m[0]);
    else if (m[5]) html += hlTag(m[0]);
    else html += esc(m[0]);
  }
  return html + esc(text.slice(last));
}

// ---------- YAML ----------

// Splits a line at the first '#' outside quotes — inside quotes it is data.
function splitComment(line) {
  let q = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === q && line[i - 1] !== "\\") q = null;
    } else if (c === '"' || c === "'") q = c;
    else if (c === "#" && (i === 0 || line[i - 1] === " ")) return [line.slice(0, i), line.slice(i)];
  }
  return [line, ""];
}

const YVAL = /^("[^"]*"|'[^']*'|&[\w.-]+|\*[\w.-]+|[|>][-+]?\d*|!+\S*|[-+]?\d[\d._e+-]*|true|false|null|~)\b/i;

export function highlightYamlLine(line) {
  const indent = line.match(/^\s*/)[0];
  let rest = line.slice(indent.length);
  let html = esc(indent);

  const [code, comment] = splitComment(rest);
  rest = code;

  // Document markers.
  if (/^(---|\.\.\.)/.test(rest)) {
    html += span("nx-punc", rest.slice(0, 3)) + esc(rest.slice(3));
  } else {
    // Sequence markers "- " can repeat for nested flow.
    while (rest.startsWith("- ") || rest === "-") {
      html += span("nx-punc", "-");
      html += esc(rest === "-" ? "" : " ");
      rest = rest.slice(rest === "-" ? 1 : 2);
    }
    // Mapping key: text up to ": " or a trailing ':' — outside quotes.
    const km = rest.match(/^("[^"]*"|'[^']*'|[^:\s][^:]*?)(:\s|:$)/);
    if (km) {
      html += span("nx-dir", km[1]) + span("nx-punc", ":") + esc(km[2].slice(1));
      rest = rest.slice(km[0].length);
    }
    // Value: highlighted token-by-token.
    while (rest.length) {
      const sp = rest.match(/^\s+/);
      if (sp) {
        html += esc(sp[0]);
        rest = rest.slice(sp[0].length);
        continue;
      }
      const vm = rest.match(YVAL);
      if (vm) {
        const v = vm[0];
        const cls = v.startsWith('"') || v.startsWith("'") ? "nx-str" : /^[-+]?\d|true|false|null|~/i.test(v) ? "nx-var" : "nx-punc";
        html += span(cls, v);
        rest = rest.slice(v.length);
      } else {
        const wm = rest.match(/^\S+/);
        html += esc(wm[0]);
        rest = rest.slice(wm[0].length);
      }
    }
  }
  if (comment) html += (code && !code.endsWith(" ") ? " " : "") + span("nx-com", comment);
  return html;
}

export function highlightYaml(text) {
  return text.split("\n").map(highlightYamlLine).join("\n");
}
