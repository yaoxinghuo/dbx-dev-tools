// RFC 3492 Punycode + RFC 3490 domain (IDNA) helpers.

const BASE = 36, TMIN = 1, TMAX = 26, SKEW = 38, DAMP = 700, INITIAL_BIAS = 72, INITIAL_N = 128;

function digitToBasic(d) {
  return d + 22 + 75 * (d < 26 ? 1 : 0);
}

function charToDigit(c) {
  const cp = c.codePointAt(0);
  if (cp - 48 < 10) return cp - 22; // '0'-'9' → 26-35
  if (cp - 65 < 26) return cp - 65; // 'A'-'Z' → 0-25
  if (cp - 97 < 26) return cp - 97; // 'a'-'z' → 0-25
  return null;
}

function adaptBias(delta, numPoints, firstTime) {
  delta = firstTime ? Math.floor(delta / DAMP) : delta >> 1;
  delta += Math.floor(delta / numPoints);
  let k = 0;
  while (delta > ((BASE - TMIN) * TMAX) >> 1) {
    delta = Math.floor(delta / (BASE - TMIN));
    k += BASE;
  }
  return k + Math.floor(((BASE - TMIN + 1) * delta) / (delta + SKEW));
}

const codePoints = (s) => [...s].map((c) => c.codePointAt(0));

export function punycodeEncode(input) {
  const cps = codePoints(input);
  const output = cps.filter((cp) => cp < 128);
  const basicLength = output.length;
  let h = basicLength;
  if (basicLength) output.push(45); // '-'
  let n = INITIAL_N, delta = 0, bias = INITIAL_BIAS;
  while (h < cps.length) {
    let m = 0x10ffff;
    for (const cp of cps) if (cp >= n && cp < m) m = cp;
    delta += (m - n) * (h + 1);
    n = m;
    for (const cp of cps) {
      if (cp < n && ++delta === 0) throw new Error("overflow");
      if (cp === n) {
        let q = delta;
        for (let k = BASE; ; k += BASE) {
          const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
          if (q < t) break;
          output.push(digitToBasic(t + ((q - t) % (BASE - t))));
          q = Math.floor((q - t) / (BASE - t));
        }
        output.push(digitToBasic(q));
        bias = adaptBias(delta, h + 1, h === basicLength);
        delta = 0;
        h++;
      }
    }
    delta++;
    n++;
  }
  return String.fromCharCode(...output);
}

export function punycodeDecode(input) {
  let n = INITIAL_N, i = 0, bias = INITIAL_BIAS;
  let output = [];
  const basicEnd = input.lastIndexOf("-");
  if (basicEnd > 0) output = codePoints(input.slice(0, basicEnd));
  for (let index = basicEnd > 0 ? basicEnd + 1 : 0; index < input.length; ) {
    const oldi = i;
    let w = 1;
    for (let k = BASE; ; k += BASE) {
      if (index >= input.length) throw new Error("invalid input");
      const digit = charToDigit(input[index++]);
      if (digit === null) throw new Error("invalid input");
      i += digit * w;
      const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
      if (digit < t) break;
      w *= BASE - t;
    }
    const outLen = output.length + 1;
    bias = adaptBias(i - oldi, outLen, oldi === 0);
    n += Math.floor(i / outLen);
    i %= outLen;
    output.splice(i, 0, n);
    i++;
  }
  return String.fromCodePoint(...output);
}

// Domain ↔ xn-- form. Labels with non-ASCII get punycoded per RFC 3490.
export function domainToAscii(domain) {
  return domain
    .toLowerCase()
    .split(".")
    .map((label) => (/[^\x00-\x7f]/.test(label) ? "xn--" + punycodeEncode(label) : label))
    .join(".");
}

export function domainToUnicode(domain) {
  return domain
    .split(".")
    .map((label) => (label.toLowerCase().startsWith("xn--") ? punycodeDecode(label.slice(4)) : label))
    .join(".");
}
