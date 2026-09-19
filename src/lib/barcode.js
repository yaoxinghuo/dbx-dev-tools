// Multi-symbology barcodes. Each encoder produces a module string
// ("1" = bar module, "0" = space module); the renderer draws 1-module rects.
// Encoding tables verified against the JsBarcode reference implementation.

/* ---------------- CODE-128 (auto A/B/C) ---------------- */

// CODE-128 patterns: values 0–102 are 11-module symbols, 106 is the stop.
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
const START_A = 103, START_B = 104, START_C = 105;
const CODE_A = 101, CODE_B = 100, CODE_C = 99, SHIFT = 98, STOP = 106;

const isCtrl = (cp) => cp < 0x20 || cp === 0x7f;
const inSetA = (cp) => cp <= 0x5f || cp === 0x7f;
const digitRun = (text, i) => {
  let n = 0;
  while (i + n < text.length && /\d/.test(text[i + n])) n++;
  return n;
};

// Walk the text choosing the cheapest set: C for digit runs >= 4 (even part),
// A for control chars, B otherwise. Single control chars inside B use Shift.
function code128Values(text) {
  for (const ch of text) {
    if (ch.codePointAt(0) > 0x7f) return null; // Latin-1/FNC4 not supported
  }
  const codes = [];
  let set = "";
  const switchTo = (s) => {
    if (set === s) return;
    codes.push(set === "" ? (s === "C" ? START_C : s === "A" ? START_A : START_B) : s === "C" ? CODE_C : s === "A" ? CODE_A : CODE_B);
    set = s;
  };

  let i = 0;
  while (i < text.length) {
    const cp = text.codePointAt(i);
    const run = digitRun(text, i);
    // C set for digit runs >= 4 (even part only — an odd trailing digit goes
    // back to B); also keeps an active C run for a >=2-digit tail.
    if (run >= 4 || (set === "C" && run >= 2 && i + run === text.length)) {
      switchTo("C");
      const even = run - (run % 2);
      for (let k = 0; k < even; k += 2) codes.push(parseInt(text.slice(i + k, i + k + 2), 10));
      i += even;
      continue;
    }
    if (isCtrl(cp)) {
      if (set === "B" && !isCtrl(text.codePointAt(i + 1) ?? 0x30)) {
        codes.push(SHIFT); // single control char inside a B run
        codes.push(cp + 64);
        i++;
        continue;
      }
      switchTo("A");
      codes.push(cp + 64);
      i++;
      continue;
    }
    // printable ASCII: sets A and B encode 0x20–0x5F identically, but
    // 0x60–0x7E (lowercase etc.) only exist in B.
    if (set === "C") switchTo("B");
    else if (set === "A" && cp > 0x5f) switchTo("B");
    else if (set === "") switchTo("B");
    codes.push(cp - 32);
    i++;
  }
  return codes;
}

function encodeCode128(text) {
  const codes = code128Values(text);
  if (!codes || !text) return { error: "asciiOnly" };
  let sum = codes[0];
  for (let i = 1; i < codes.length; i++) sum += codes[i] * i;
  codes.push(sum % 103, STOP);
  return { modules: codes.map((c) => PATTERNS[c]).join(""), label: text };
}

/* ---------------- CODE-39 ---------------- */

const C39_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%*";
const C39_PATTERNS = [
  20957, 29783, 23639, 30485, 20951, 29813, 23669, 20855,
  29789, 23645, 29975, 23831, 30533, 22295, 30149, 24005,
  21623, 29981, 23837, 22301, 30023, 23879, 30545, 22343,
  30161, 24017, 21959, 30065, 23921, 22385, 29015, 18263,
  29141, 17879, 29045, 18293, 17783, 29021, 18269, 17477,
  17489, 17681, 20753, 35770,
];
const c39Module = (ch) => C39_PATTERNS[C39_CHARS.indexOf(ch)].toString(2).padStart(15, "0");

function encodeCode39(text) {
  const data = text.toUpperCase();
  if (!/^[0-9A-Z\-. $/+%]+$/.test(data)) return { error: "code39Charset" };
  let modules = c39Module("*");
  for (const ch of data) modules += "0" + c39Module(ch);
  modules += "0" + c39Module("*");
  return { modules, label: `*${data}*` };
}

/* ---------------- EAN / UPC ---------------- */

const EAN_SIDE = "101";
const EAN_MID = "01010";
const EAN_BIN = {
  L: ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"],
  G: ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"],
  R: ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"],
};
const EAN13_PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

const digits = (t, n) => new RegExp(`^[0-9]{${n}}$`).test(t);

// weights[startW]: alternating weights beginning at index 0.
function mod10(num, firstWeight = 1) {
  let sum = 0;
  for (let i = 0; i < num.length; i++) sum += Number(num[i]) * ((i % 2 === 0) === (firstWeight === 1) ? 1 : 3);
  return (10 - (sum % 10)) % 10;
}

function eanJoin(data, leftStructure, leftSlice, rightSlice) {
  const left = [...leftSlice[0]].map((d, i) => EAN_BIN[leftStructure[i]][Number(d)]).join("");
  const right = [...rightSlice[0]].map((d) => EAN_BIN.R[Number(d)]).join("");
  return EAN_SIDE + left + EAN_MID + right + EAN_SIDE;
}

function encodeEan13(text) {
  let data = text;
  if (digits(data, 12)) data += mod10(data, 1);
  if (!digits(data, 13)) return { error: "ean13len" };
  if (mod10(data.slice(0, 12), 1) !== Number(data[12])) return { error: "checksum" };
  const parity = EAN13_PARITY[Number(data[0])];
  return { modules: eanJoin(data, parity, [data.slice(1, 7)], [data.slice(7)]), label: data };
}

function encodeEan8(text) {
  let data = text;
  if (digits(data, 7)) data += mod10(data, 3);
  if (!digits(data, 8)) return { error: "ean8len" };
  if (mod10(data.slice(0, 7), 3) !== Number(data[7])) return { error: "checksum" };
  return { modules: eanJoin(data, "LLLL", [data.slice(0, 4)], [data.slice(4)]), label: data };
}

function encodeUpcA(text) {
  let data = text;
  if (digits(data, 11)) data += mod10(data, 3);
  if (!digits(data, 12)) return { error: "upcalen" };
  if (mod10(data.slice(0, 11), 3) !== Number(data[11])) return { error: "checksum" };
  return { modules: eanJoin(data, "LLLLLL", [data.slice(0, 6)], [data.slice(6)]), label: data };
}

/* ---------------- ITF / ITF-14 ---------------- */

const ITF_START = "1010";
const ITF_END = "11101";
const ITF_BIN = ["00110", "10001", "01001", "11000", "00101", "10100", "01100", "00011", "10010", "01010"];

function encodeItfRaw(data) {
  let out = ITF_START;
  for (let i = 0; i < data.length; i += 2) {
    const bars = ITF_BIN[Number(data[i])];
    const spaces = ITF_BIN[Number(data[i + 1])];
    for (let k = 0; k < 5; k++) out += (bars[k] === "1" ? "111" : "1") + (spaces[k] === "1" ? "000" : "0");
  }
  return out + ITF_END;
}

function encodeItf(text) {
  if (!/^[0-9]+$/.test(text) || text.length % 2) return { error: "itfLen" };
  return { modules: encodeItfRaw(text), label: text };
}

function encodeItf14(text) {
  let data = text;
  if (digits(data, 13)) {
    let sum = 0;
    for (let i = 0; i < 13; i++) sum += Number(data[i]) * (i % 2 === 0 ? 3 : 1);
    data += String(Math.ceil(sum / 10) * 10 - sum);
  }
  if (!digits(data, 14)) return { error: "itf14len" };
  let sum = 0;
  for (let i = 0; i < 13; i++) sum += Number(data[i]) * (i % 2 === 0 ? 3 : 1);
  if (Math.ceil(sum / 10) * 10 - sum !== Number(data[13])) return { error: "checksum" };
  return { modules: encodeItfRaw(data), label: data };
}

/* ---------------- Codabar ---------------- */

const CODABAR = {
  "0": "101010011", "1": "101011001", "2": "101001011", "3": "110010101",
  "4": "101101001", "5": "110101001", "6": "100101011", "7": "100101101",
  "8": "100110101", "9": "110100101", "-": "101001101", "$": "101100101",
  ":": "1101011011", "/": "1101101011", ".": "1101101101", "+": "1011011011",
  A: "1011001001", B: "1001001011", C: "1010010011", D: "1010011001",
};

function encodeCodabar(text) {
  let data = text.toUpperCase();
  // Guards default to A…A when the input has none.
  if (/^[0-9\-$:./+]+$/.test(data)) data = "A" + data + "A";
  if (!/^[A-D][0-9\-$:./+]+[A-D]$/.test(data)) return { error: "codabarCharset" };
  return { modules: [...data].map((c) => CODABAR[c]).join("0"), label: data };
}

/* ---------------- dispatcher + renderer ---------------- */

export const SYMBOLOGIES = ["code128", "code39", "ean13", "ean8", "upca", "itf", "itf14", "codabar"];

const ENCODERS = {
  code128: encodeCode128,
  code39: encodeCode39,
  ean13: encodeEan13,
  ean8: encodeEan8,
  upca: encodeUpcA,
  itf: encodeItf,
  itf14: encodeItf14,
  codabar: encodeCodabar,
};

export function encodeBarcode(sym, text) {
  return (ENCODERS[sym] || encodeCode128)(text.trim());
}

// Kept for compatibility with existing callers.
export function isEncodable(text) {
  return /^[\x00-\x7f]+$/.test(text);
}

export function encodeCode128B(text) {
  if (!/^[\x20-\x7e]+$/.test(text)) throw new Error("CODE-128 B supports printable ASCII only");
  const codes = [START_B];
  for (const ch of text) codes.push(ch.charCodeAt(0) - 32);
  let checksum = START_B;
  for (let i = 1; i < codes.length; i++) checksum += codes[i] * i;
  codes.push(checksum % 103, STOP);
  return codes.map((c) => PATTERNS[c]).join("");
}

export function barcodeSvg(text, { sym = "code128", barWidth = 2, height = 80, margin = 10, showText = true } = {}) {
  const { modules, label, error } = encodeBarcode(sym, text);
  if (error) return { error };
  const textHeight = showText ? 16 : 0;
  const width = modules.length * barWidth + margin * 2;
  const totalHeight = height + margin + textHeight;
  let rects = "";
  for (let i = 0; i < modules.length; i++) {
    if (modules[i] === "1") {
      rects += `<rect x="${margin + i * barWidth}" y="${margin}" width="${barWidth}" height="${height}"/>`;
    }
  }
  const caption = showText
    ? `<text x="${width / 2}" y="${margin + height + 13}" text-anchor="middle" font-family="monospace" font-size="12" fill="currentColor">${escapeXml(label)}</text>`
    : "";
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}" viewBox="0 0 ${width} ${totalHeight}"><g fill="currentColor">${rects}</g>${caption}</svg>`,
    label,
  };
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
