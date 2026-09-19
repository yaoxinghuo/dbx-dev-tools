// Line-oriented text processing. Pure function — ops applied in a fixed order.

export function processLines(text, opts = {}) {
  const { trim = false, removeEmpty = false, dedupe = false, sort = "none", number = false, reverse = false } = opts;
  let lines = text.split("\n");
  if (trim) lines = lines.map((l) => l.trim());
  if (removeEmpty) lines = lines.filter((l) => l.trim() !== "");
  if (dedupe) lines = [...new Set(lines)];
  if (sort === "asc") lines = [...lines].sort((a, b) => a.localeCompare(b));
  else if (sort === "desc") lines = [...lines].sort((a, b) => b.localeCompare(a));
  if (reverse) lines.reverse();
  if (number) {
    const pad = String(lines.length).length;
    lines = lines.map((l, i) => `${String(i + 1).padStart(pad, " ")}. ${l}`);
  }
  return lines.join("\n");
}
