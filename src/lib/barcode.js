// CODE 128 subset B: printable ASCII (0x20–0x7E). Patterns are the standard
// 11-module symbol strings indexed by code value; 106 is the stop pattern.
const PATTERNS = [
  "11011001100", "11001101100", "11001100110", "10010011000", "10010001100",
  "10001001100", "10011001000", "10011000100", "10001100100", "11001001000",
  "11001000100", "11000100100", "10110011100", "10011011100", "10011001110",
  "10111001100", "10011101100", "10011100110", "11001110010", "11001011100",
  "11001001110", "11011100100", "11001110100", "11101101110", "11101001100",
  "11100101100", "11100100110", "11101100100", "11100110100", "11100110010",
  "11011011000", "11011000110", "11000110110", "10100011000", "10001011000",
  "10001000110", "10110001000", "10001101000", "10001100010", "11010001000",
  "11000101000", "11000100010", "10110111000", "10110001110", "10001101110",
  "10111011000", "10111000110", "10001110110", "11101110110", "11010001110",
  "11000101110", "11011101000", "11011100010", "11011101110", "11101011000",
  "11101000110", "11100010110", "11101101000", "11101100010", "11100011010",
  "11101111010", "11001000010", "11110001010", "10100110000", "10100001100",
  "10010110000", "10010000110", "10000101100", "10000100110", "10110010000",
  "10110000100", "10011010000", "10011000010", "10000110100", "10000110010",
  "11000010010", "11001010000", "11110111010", "11000010100", "10001111010",
  "10100111100", "10010111100", "10010011110", "10111100100", "10011110100",
  "10011110010", "11110100100", "11110010100", "11110010010", "11011011110",
  "11011110110", "11110110110", "10101111000", "10100011110", "10001011110",
  "10111101000", "10111100010", "11110101000", "11110100010", "10111011110",
  "10111101110", "11101011110", "11110101110", "11010000100", "11010010000",
  "11010011100", "1100011101011",
];

const START_B = 104;
const STOP = 106;

export function isEncodable(text) {
  return /^[\x20-\x7e]+$/.test(text);
}

// Returns the module pattern string ("1" = bar, "0" = space) for the full
// symbol including start, data, checksum and stop (13 modules for stop).
export function encodeCode128B(text) {
  if (!isEncodable(text)) throw new Error("CODE-128 B supports printable ASCII only");
  const codes = [START_B];
  for (const ch of text) codes.push(ch.charCodeAt(0) - 32);
  let checksum = START_B;
  for (let i = 1; i < codes.length; i++) checksum += codes[i] * i;
  codes.push(checksum % 103, STOP);
  return codes.map((c) => PATTERNS[c]).join("");
}

export function barcodeSvg(text, { barWidth = 2, height = 80, margin = 10, showText = true } = {}) {
  const modules = encodeCode128B(text);
  const textHeight = showText ? 16 : 0;
  const width = modules.length * barWidth + margin * 2;
  const totalHeight = height + margin + textHeight;
  let rects = "";
  for (let i = 0; i < modules.length; i++) {
    if (modules[i] === "1") {
      rects += `<rect x="${margin + i * barWidth}" y="${margin}" width="${barWidth}" height="${height}"/>`;
    }
  }
  const label = showText
    ? `<text x="${width / 2}" y="${margin + height + 13}" text-anchor="middle" font-family="monospace" font-size="12" fill="currentColor">${escapeXml(text)}</text>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}" viewBox="0 0 ${width} ${totalHeight}"><g fill="currentColor">${rects}</g>${label}</svg>`;
}

function escapeXml(value) {
  return value.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function svgToPngBytes(svg, scale = 2) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error("PNG export failed"));
        blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to render SVG"));
    };
    img.src = url;
  });
}
