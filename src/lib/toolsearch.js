import { TOOLS } from "./tools.js";
import { allMessages } from "./i18n.js";

// Multilingual search index: a Chinese query must find a tool even under an
// English UI, and vice versa — so index every locale's name/desc/tags.
export function buildSearchIndex() {
  const all = allMessages();
  const index = new Map();
  for (const tool of TOOLS) {
    const parts = [tool.key, tool.contributionId];
    for (const lang of Object.values(all)) {
      const meta = lang.tools[tool.key];
      if (meta) parts.push(meta.name, meta.desc);
      for (const tag of tool.tags) parts.push(lang.tags[tag] || tag);
    }
    index.set(tool.key, parts.join("\n").toLowerCase());
  }
  return index;
}
