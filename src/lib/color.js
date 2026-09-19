// Color conversion + WCAG contrast. Pure functions.

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Returns {r,g,b,a} (a 0-1) or null.
export function parseColor(text) {
  const t = text.trim().toLowerCase();
  let m = /^#([0-9a-f]{3,8})$/.exec(t);
  if (m) {
    const h = m[1];
    if (h.length === 3 || h.length === 4) {
      const [r, g, b, a] = [...h].map((c) => parseInt(c + c, 16));
      return { r, g, b, a: h.length === 4 ? a / 255 : 1 };
    }
    if (h.length === 6 || h.length === 8) {
      const v = [...h.match(/../g)].map((x) => parseInt(x, 16));
      return { r: v[0], g: v[1], b: v[2], a: h.length === 8 ? v[3] / 255 : 1 };
    }
    return null;
  }
  m = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([\d.]+%?)\s*)?\)$/.exec(t);
  if (m) {
    const [r, g, b] = [m[1], m[2], m[3]].map(Number);
    if ([r, g, b].some((v) => v > 255)) return null;
    let a = 1;
    if (m[4] !== undefined) a = m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { r, g, b, a: clamp(a, 0, 1) };
  }
  m = /^hsla?\(\s*([\d.]+)(?:deg)?\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+%?)\s*)?\)$/.exec(t);
  if (m) {
    const rgb = hslToRgb(parseFloat(m[1]), parseFloat(m[2]) / 100, parseFloat(m[3]) / 100);
    let a = 1;
    if (m[4] !== undefined) a = m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { ...rgb, a: clamp(a, 0, 1) };
  }
  return null;
}

export function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}

export function rgbToHsl({ r, g, b }) {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === R ? ((G - B) / d + (G < B ? 6 : 0))
    : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return { h: h * 60, s, l };
}

export function rgbToHsv({ r, g, b }) {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, v: max };
  const h = max === R ? ((G - B) / d + (G < B ? 6 : 0))
    : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return { h: h * 60, s: d / max, v: max };
}

const hex2 = (v) => v.toString(16).padStart(2, "0");

export function toHex({ r, g, b, a }) {
  const base = "#" + hex2(r) + hex2(g) + hex2(b);
  return a < 1 ? base + hex2(Math.round(a * 255)) : base;
}

const f1 = (v) => Math.round(v * 10) / 10;
const f2 = (v) => Math.round(v * 100) / 100;

export function describe(c) {
  const hsl = rgbToHsl(c);
  const hsv = rgbToHsv(c);
  const alpha = c.a < 1;
  return {
    hex: toHex(c),
    rgb: alpha ? `rgba(${c.r}, ${c.g}, ${c.b}, ${f2(c.a)})` : `rgb(${c.r}, ${c.g}, ${c.b})`,
    hsl: alpha
      ? `hsla(${f1(hsl.h)}, ${f1(hsl.s * 100)}%, ${f1(hsl.l * 100)}%, ${f2(c.a)})`
      : `hsl(${f1(hsl.h)}, ${f1(hsl.s * 100)}%, ${f1(hsl.l * 100)}%)`,
    hsv: `hsv(${f1(hsv.h)}, ${f1(hsv.s * 100)}%, ${f1(hsv.v * 100)}%)`,
  };
}

function lin(c) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function luminance({ r, g, b }) {
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(c1, c2) {
  const [l1, l2] = [luminance(c1), luminance(c2)];
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}
