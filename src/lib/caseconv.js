// Case conversion. Pure functions.

// Split into words: handles separators and camelCase/PascalCase boundaries
// (also splits "HTTPServer" -> "HTTP", "Server").
export function splitWords(text) {
  return text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
}

const cap = (w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w);
const low = (w) => w.toLowerCase();
const up = (w) => w.toUpperCase();

export const CASES = [
  "lower",
  "upper",
  "camel",
  "pascal",
  "snake",
  "kebab",
  "constant",
  "title",
  "sentence",
  "dot",
];

export function convert(text) {
  const words = splitWords(text);
  if (!words.length) return [];
  const lower = words.map(low);
  const titled = words.map(cap);
  return [
    { key: "lower", value: lower.join(" ") },
    { key: "upper", value: lower.join(" ").toUpperCase() },
    { key: "camel", value: lower[0] + titled.slice(1).join("") },
    { key: "pascal", value: titled.join("") },
    { key: "snake", value: lower.join("_") },
    { key: "kebab", value: lower.join("-") },
    { key: "constant", value: lower.map(up).join("_") },
    { key: "title", value: titled.join(" ") },
    {
      key: "sentence",
      value: lower[0][0].toUpperCase() + lower[0].slice(1) + (lower.length > 1 ? " " + lower.slice(1).join(" ") : ""),
    },
    { key: "dot", value: lower.join(".") },
  ];
}
