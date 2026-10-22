// Nginx config formatter — vendored port of nginxfmt.py.
//
// Upstream:  https://github.com/1connect/nginx-config-formatter (Apache-2.0)
// JS port of: https://github.com/denysvitali/nginxbeautifier (Apache-2.0)
//
// Trimmed to the formatting core: polyfills, the fs-dependent directory
// walker and the module-global options bag were removed; every function now
// takes its options explicitly.

// Replaces each quoted span with a placeholder so whitespace collapsing and
// brace splitting never touch string contents; getRestored() puts them back.
function extractAllPossibleText(input, sep1, sep2 = sep1) {
  const extracted = {};
  const c1 = sep1.charCodeAt(0);
  const c2 = sep2.charCodeAt(0);
  const re = new RegExp(sep1 + "(.*?)" + sep2);
  let cnt = 0;
  let textInBetween;
  while ((textInBetween = (input.match(re) || [])[1]) != null && textInBetween !== "") {
    const placeholder = `#$#%#$#placeholder${cnt}${c1}${c2}#$#%#$#`;
    extracted[placeholder] = sep1 + textInBetween + sep2;
    input = input.replace(extracted[placeholder], placeholder);
    cnt++;
  }
  return {
    filteredInput: input,
    extracted,
    getRestored() {
      let out = this.filteredInput;
      for (const key in extracted) out = out.replace(key, extracted[key]);
      return out;
    },
  };
}

// Trims a line and collapses runs of whitespace — except inside quotes, and
// except in sub_filter where meaningful spacing lives inside arguments too.
function stripLine(line) {
  const removed = extractAllPossibleText(line.trim(), '"', '"');
  if (!removed.filteredInput.includes("sub_filter")) {
    removed.filteredInput = removed.filteredInput.replace(/\s\s+/g, " ");
  }
  return removed.getRestored();
}

// Splits { } onto their own lines, normalizes whitespace and collapses runs
// of blank lines down to at most two.
function cleanLines(text) {
  const lines = text.split(/\r\n|\r|\n/g);
  let blank = 0;
  for (let i = 0; i < lines.length; i++) {
    lines[i] = lines[i].trim();
    if (!lines[i].startsWith("#") && lines[i] !== "") {
      blank = 0;
      const line = (lines[i] = stripLine(lines[i]));
      // Braces inside quotes are string content, never structure.
      if (line !== "}" && line !== "{" && !(line.includes("('{") || line.includes("}')") || line.includes("'{'") || line.includes("'}'"))) {
        const commentStart = line.indexOf("#");
        const comment = commentStart >= 0 ? line.slice(commentStart).trim() : "";
        const code = commentStart >= 0 ? line.slice(0, commentStart) : line;
        // Split into pieces at every brace; the upstream JS port dropped
        // trailing comments, so keep them by appending to the last piece.
        const pieces = [];
        let rest = code;
        for (;;) {
          const open = rest.indexOf("{");
          const close = rest.indexOf("}");
          const cut = open === -1 ? close : close === -1 ? open : Math.min(open, close);
          if (cut === -1) {
            const t = stripLine(rest);
            if (t) pieces.push(t);
            break;
          }
          const before = stripLine(rest.slice(0, cut));
          if (before) pieces.push(before);
          pieces.push(rest[cut]);
          rest = rest.slice(cut + 1);
        }
        if (comment) {
          if (pieces.length) pieces[pieces.length - 1] += " " + comment;
          else pieces.push(comment);
        }
        if (pieces.length) lines.splice(i, 1, ...pieces);
        else lines[i] = "";
      }
    } else if (lines[i] === "") {
      if (blank++ >= 2) {
        lines.splice(i, 1);
        i--;
      }
    }
  }
  return lines;
}

function joinOpeningBracket(lines) {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === "{" && i >= 1) {
      lines[i] = lines[i - 1] + " {";
      lines.splice(i - 1, 1);
      i--;
    }
  }
  return lines;
}

function performIndentation(lines, indentation) {
  const out = [];
  let depth = 0;
  for (const line of lines) {
    if (!line.startsWith("#") && line.endsWith("}") && depth > 0) depth--;
    out.push(line === "" ? "" : indentation.repeat(depth) + line);
    if (!line.startsWith("#") && line.endsWith("{")) depth++;
  }
  return out;
}

// Column-aligns directive values within each block, gofmt-style. Off by
// default — it's opinionated and re-flows diffs heavily.
function performAlignment(lines) {
  const all = [...lines];
  const attrLines = new Set();
  let minColumn = 0;
  for (const line of lines) {
    if (
      line !== "" &&
      !line.endsWith("{") &&
      !line.startsWith("#") &&
      !line.endsWith("}") &&
      !line.trim().startsWith("upstream") &&
      !line.trim().includes("location")
    ) {
      const parts = line.match(/\S+/g);
      if (parts && parts.length > 1) {
        attrLines.add(line);
        minColumn = Math.max(minColumn, line.indexOf(parts[1]) + 1);
      }
    }
  }
  for (let i = 0; i < all.length; i++) {
    const line = all[i];
    if (attrLines.has(line)) {
      const parts = line.match(/\S+/g);
      const indent = line.match(/^\s*/)[0];
      all[i] = indent + parts[0] + " ".repeat(Math.max(1, minColumn - parts[0].length - indent.length)) + parts.slice(1).join(" ");
    }
  }
  return all;
}

/**
 * Format an nginx config string.
 * opts: { indentation = "    ", joinBrackets = true, align = false }
 */
export function formatNginx(text, opts = {}) {
  const { indentation = "    ", joinBrackets = true, align = false } = opts;
  let lines = cleanLines(text);
  if (joinBrackets) lines = joinOpeningBracket(lines);
  lines = performIndentation(lines, indentation);
  if (align) lines = performAlignment(lines);
  return lines.join("\n");
}
