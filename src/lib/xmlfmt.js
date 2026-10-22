// XML pretty-printer — tokenizes markup (comments, CDATA, PIs, DOCTYPE,
// tags, text) and re-indents by nesting depth. Attribute lists and entity
// references are left byte-for-byte untouched; formatting never rewrites
// content, it only re-flows whitespace.
//
// Validation is delegated to the browser's DOMParser.

const TOKEN = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*(?:\[[\s\S]*?\][^>]*)?>|<[^>]+>|[^<]+/gi;

function classify(tok) {
  if (tok.startsWith("<!--")) return "comment";
  if (tok.startsWith("<![CDATA[")) return "cdata";
  if (tok.startsWith("<?")) return "pi";
  if (/^<!/i.test(tok)) return "decl";
  if (tok.startsWith("</")) return "close";
  if (tok.startsWith("<")) return tok.endsWith("/>") ? "self" : "open";
  return "text";
}

export function formatXml(input, indentation = "  ") {
  const toks = input.match(TOKEN) || [];
  const out = [];
  let depth = 0;
  for (let i = 0; i < toks.length; i++) {
    const tok = toks[i];
    const kind = classify(tok);
    if (kind === "text") {
      const t = tok.trim();
      if (!t) continue;
      // <a>text</a> stays on one line when text is the only child.
      if (classify(toks[i - 1] || "") === "open" && classify(toks[i + 1] || "") === "close") {
        out[out.length - 1] += t + toks[i + 1].trim().replace(/\s+>$/, ">");
        i++; // consume the close tag
        depth = Math.max(0, depth - 1); // the merged </tag> still closes a level
      } else {
        out.push(indentation.repeat(depth) + t);
      }
      continue;
    }
    if (kind === "close") {
      depth = Math.max(0, depth - 1);
      out.push(indentation.repeat(depth) + tok.trim().replace(/\s+>$/, ">"));
      continue;
    }
    out.push(indentation.repeat(depth) + tok.trim());
    if (kind === "open") depth++;
  }
  return out.join("\n");
}

// Returns an error string or null when the input parses as XML.
export function validateXml(input) {
  const doc = new DOMParser().parseFromString(input, "text/xml");
  const err = doc.querySelector("parsererror");
  return err ? err.textContent.trim() : null;
}
