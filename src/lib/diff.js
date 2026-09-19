// LCS-based diff for lines and characters. Pure functions for testability.

// Hard cap on the DP matrix (4M cells * 4B = 16MB). Larger inputs fall back
// to prefix/suffix trimming and treat the middle as fully replaced.
const MAX_CELLS = 4_000_000;

// a, b: arrays of units (lines or chars). Returns [{op: "same"|"del"|"ins", text}]
// where adjacent runs of the same op are merged, joined by sep.
export function diffUnits(a, b, sep = "") {
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);

  const ops = [];
  const push = (op, text) => {
    const last = ops[ops.length - 1];
    if (last && last.op === op) last.text += sep + text;
    else ops.push({ op, text });
  };

  for (let i = 0; i < start; i++) push("same", a[i]);

  if (midA.length * midB.length <= MAX_CELLS) {
    const n = midA.length;
    const m = midB.length;
    const stride = m + 1;
    const dp = new Int32Array((n + 1) * stride);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i * stride + j] = midA[i] === midB[j]
          ? dp[(i + 1) * stride + j + 1] + 1
          : Math.max(dp[(i + 1) * stride + j], dp[i * stride + j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (midA[i] === midB[j]) {
        push("same", midA[i]);
        i++;
        j++;
      } else if (dp[(i + 1) * stride + j] >= dp[i * stride + j + 1]) {
        push("del", midA[i]);
        i++;
      } else {
        push("ins", midB[j]);
        j++;
      }
    }
    while (i < n) push("del", midA[i++]);
    while (j < m) push("ins", midB[j++]);
  } else {
    for (const x of midA) push("del", x);
    for (const x of midB) push("ins", x);
  }

  for (let i = endA; i < a.length; i++) push("same", a[i]);
  return ops;
}

// Lines keep trailing \n out of units for display; rendering joins with \n.
export function diffLines(textA, textB) {
  return diffUnits(textA.split("\n"), textB.split("\n"), "\n");
}

export function diffChars(textA, textB) {
  return diffUnits([...textA], [...textB]);
}

export function diffStats(ops, sep = "") {
  let ins = 0;
  let del = 0;
  for (const o of ops) {
    const n = sep ? o.text.split(sep).length : o.text.length;
    if (o.op === "ins") ins += n;
    else if (o.op === "del") del += n;
  }
  return { ins, del };
}
