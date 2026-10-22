// YAML re-indenter — line-based, semantics-preserving. It normalizes the
// indent of every structural line to a chosen width, collapses blank runs,
// and leaves everything that carries meaning alone: comments, block scalars
// (| > |- >- |+ >+), anchors/aliases and quoted scalars.
//
// It deliberately does NOT parse YAML — a parse+dump would drop comments,
// which are half the content of real-world YAML configs. What it can and
// does catch: TAB characters in indentation (illegal in YAML), reported as
// a warning.
//
// Depth model: a stack of ancestor indents. Each line's level is the count
// of strictly-smaller indents on the stack — so a deeper line becomes a
// child, and popping back to a seen indent lands on the same level.

const BLOCK_SCALAR = /:\s*[|>][-+]?\s*(?:#.*)?$/;

function indentOf(line) {
  let n = 0;
  for (const ch of line) {
    if (ch === " ") n++;
    else if (ch === "\t") n++; // tab counts as a level, reported separately
    else break;
  }
  return n;
}

export function formatYaml(input, indentation = "  ") {
  const src = input.split(/\r\n|\r|\n/);
  const hasTabs = src.some((l) => /^\s*\t/.test(l));
  const out = [];
  const stack = []; // ancestor indents, ascending
  let blank = 0;
  // When a line carries a block scalar header, everything deeper-indented
  // than that line is literal content: kept verbatim, only re-based so the
  // least-indented content line sits exactly one level under the header.
  let scalarBase = -1; // old indent that opened a block scalar (-1 = none)
  let scalarBaseInd = 0; // indent of the first scalar content line

  const commentIndent = (idx) => {
    // Comments take the level of the next code line — they belong to what
    // they annotate. Simulated on a stack copy; the real one must not move.
    for (let j = idx + 1; j < src.length; j++) {
      const l = src[j];
      if (!l.trim()) continue;
      const sim = [...stack];
      const ind = indentOf(l);
      while (sim.length && sim[sim.length - 1] >= ind) sim.pop();
      sim.push(ind);
      return sim.length - 1;
    }
    return Math.max(0, stack.length - 1);
  };

  for (let i = 0; i < src.length; i++) {
    const raw = src[i];
    const trimmed = raw.trim();

    if (scalarBase >= 0) {
      if (trimmed === "") {
        out.push(""); // blank lines inside a scalar are content
        continue;
      }
      const ci = indentOf(raw);
      if (ci > scalarBase) {
        if (scalarBaseInd === 0) scalarBaseInd = ci;
        const extra = Math.max(0, ci - scalarBaseInd);
        out.push(indentation.repeat(stack.length) + " ".repeat(extra) + trimmed);
        continue;
      }
      scalarBase = -1;
      scalarBaseInd = 0;
    }

    if (trimmed === "") {
      if (++blank > 1) continue;
      out.push("");
      continue;
    }
    blank = 0;

    if (/^(---|\.\.\.)(\s|$)/.test(trimmed)) {
      stack.length = 0;
      out.push(trimmed === "..." ? "..." : trimmed.split(/\s/)[0] + (trimmed.length > 3 ? " " + trimmed.slice(4).trim() : ""));
      continue;
    }

    const ind = indentOf(raw);
    if (trimmed.startsWith("#")) {
      out.push(indentation.repeat(Math.max(0, commentIndent(i))) + trimmed);
      continue;
    }

    while (stack.length && stack[stack.length - 1] >= ind) stack.pop();
    stack.push(ind);
    const level = stack.length - 1;
    out.push(indentation.repeat(level) + trimmed.replace(/\s+$/, ""));

    if (BLOCK_SCALAR.test(trimmed)) scalarBase = ind;
  }

  // Tidy: single trailing newline, no leading blanks.
  const text = out.join("\n").replace(/\n{3,}/g, "\n\n").replace(/^\n+/, "").replace(/\n*$/, "") + "\n";
  return { text, hasTabs };
}
