// HTTP header text ⇄ structured data. Pure functions.

// Parses raw header text (as pasted from DevTools / curl -v / Postman) into
// [name, value] pairs. Tolerates the request/status line, comments and
// blank lines; returns { headers, skipped } where skipped = [lineNo, line].
export function parseHeaders(text) {
  const headers = [];
  const skipped = [];
  text.split(/\r?\n/).forEach((line, i) => {
    const l = line.trim();
    if (!l || l.startsWith("#") || l.startsWith("//")) return;
    // Request line "GET /path HTTP/2" and status line "HTTP/1.1 200 OK".
    if (/^HTTP\/[\d.]+/i.test(l)) return;
    if (/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|TRACE|CONNECT)\s+\S+/i.test(l)) return;
    const idx = l.indexOf(":");
    if (idx <= 0) {
      skipped.push([i + 1, l]);
      return;
    }
    const name = l.slice(0, idx).trim();
    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name)) {
      skipped.push([i + 1, l]);
      return;
    }
    headers.push([name, l.slice(idx + 1).trim()]);
  });
  return { headers, skipped };
}

// Headers -> JSON object. Repeated names become arrays — merging with ", "
// is wrong for headers like Set-Cookie.
export function headersToJson(headers) {
  const obj = {};
  for (const [name, value] of headers) {
    if (obj[name] === undefined) obj[name] = value;
    else if (Array.isArray(obj[name])) obj[name].push(value);
    else obj[name] = [obj[name], value];
  }
  return JSON.stringify(obj, null, 2);
}

// JSON object -> raw header lines. Arrays expand to repeated lines.
export function jsonToHeaders(text) {
  const obj = JSON.parse(text);
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    throw new Error("top-level JSON object expected");
  }
  const lines = [];
  for (const [name, value] of Object.entries(obj)) {
    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name)) throw new Error(`invalid header name: ${name}`);
    for (const v of Array.isArray(value) ? value : [value]) {
      lines.push(`${name}: ${typeof v === "object" && v !== null ? JSON.stringify(v) : v}`);
    }
  }
  return lines.join("\n");
}
