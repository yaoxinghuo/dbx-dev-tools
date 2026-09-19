import qrcode from "qrcode-generator";
import { svgToPngBytes } from "./barcode.js";

export function qrMatrix(text, ecLevel = "M") {
  const qr = qrcode(0, ecLevel); // type 0 = auto-detect smallest version
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  const matrix = [];
  for (let r = 0; r < count; r++) {
    const row = [];
    for (let c = 0; c < count; c++) row.push(qr.isDark(r, c));
    matrix.push(row);
  }
  return matrix;
}

export function qrSvg(text, { ecLevel = "M", scale = 6, margin = 4, logoUri = "" } = {}) {
  const matrix = qrMatrix(text, ecLevel);
  const count = matrix.length;
  const size = (count + margin * 2) * scale;
  let rects = "";
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (matrix[r][c]) {
        rects += `<rect x="${(c + margin) * scale}" y="${(r + margin) * scale}" width="${scale}" height="${scale}"/>`;
      }
    }
  }
  let overlay = "";
  // Centered logo over a white rounded backdrop — needs EC H (30%) to stay
  // scannable; UI steers the level when a logo is picked.
  if (logoUri.startsWith("data:image/")) {
    const box = Math.round(size * 0.22);
    const pad = Math.round(scale * 1.5);
    const x = (size - box) / 2 - pad;
    const w = box + pad * 2;
    overlay = `<rect x="${x}" y="${x}" width="${w}" height="${w}" rx="${Math.round(w / 6)}" fill="#ffffff"/>` +
      `<image href="${logoUri}" x="${(size - box) / 2}" y="${(size - box) / 2}" width="${box}" height="${box}" preserveAspectRatio="xMidYMid meet"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><g fill="currentColor">${rects}</g>${overlay}</svg>`;
}

export { svgToPngBytes };
