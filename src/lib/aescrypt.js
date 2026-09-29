// AES-GCM with PBKDF2 key derivation. Async (WebCrypto).
// Wire format v1: "A1:" + base64( iter(4B BE) | keyBytes(1B) | salt(16) | iv(12) | ciphertext+tag )
// Legacy payloads (bare base64 of salt|iv|ct, 100k iterations, AES-256) still decrypt.

const PREFIX = "A1:";
const LEGACY_ITERATIONS = 100_000;
const te = new TextEncoder();
const td = new TextDecoder();

const b64 = (bytes) => btoa([...bytes].map((b) => String.fromCharCode(b)).join(""));
const unb64 = (s) => Uint8Array.from(atob(s.trim()), (c) => c.charCodeAt(0));

// Accepts hex or base64; AES requires exactly 16/24/32 bytes.
export function parseKeyMaterial(text) {
  const t = text.trim();
  let bytes;
  if (/^[0-9a-f]+$/i.test(t) && t.length % 2 === 0) {
    bytes = Uint8Array.from(t.match(/../g).map((h) => parseInt(h, 16)));
  } else {
    try { bytes = unb64(t); } catch { throw new Error("key is not valid hex or Base64"); }
  }
  if (![16, 24, 32].includes(bytes.length)) throw new Error(`key must be 16/24/32 bytes, got ${bytes.length}`);
  return bytes;
}

export function randomKeyHex(len = 32) {
  return [...crypto.getRandomValues(new Uint8Array(len))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Raw-key mode for interop with other stacks. Packed wire format:
// base64( iv | ciphertext+tag ) — iv is 12 bytes for GCM, 16 for CBC
// (CBC uses WebCrypto's built-in PKCS#7 padding).
export async function aesCryptRaw(op, text, keyBytes, { mode = "gcm", aad = "" } = {}) {
  const gcm = mode === "gcm";
  const ivLen = gcm ? 12 : 16;
  const key = await crypto.subtle.importKey(
    "raw", keyBytes, { name: gcm ? "AES-GCM" : "AES-CBC" }, false, [op === "enc" ? "encrypt" : "decrypt"],
  );
  // additionalData must be omitted entirely when unused — WebIDL treats an
  // explicit `undefined` BufferSource member as a type error.
  const aadBytes = gcm && aad ? te.encode(aad) : null;
  const alg = gcm
    ? { name: "AES-GCM", ...(aadBytes ? { additionalData: aadBytes } : {}) }
    : { name: "AES-CBC" };
  if (op === "enc") {
    const iv = crypto.getRandomValues(new Uint8Array(ivLen));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ ...alg, iv }, key, te.encode(text)));
    const out = new Uint8Array(ivLen + ct.length);
    out.set(iv); out.set(ct, ivLen);
    return b64(out);
  }
  const raw = unb64(text);
  if (raw.length <= ivLen) throw new Error("payload too short");
  const pt = await crypto.subtle.decrypt({ ...alg, iv: raw.slice(0, ivLen) }, key, raw.slice(ivLen));
  return td.decode(pt);
}

async function deriveKey(password, salt, iterations, keyBytes) {
  const base = await crypto.subtle.importKey("raw", te.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: keyBytes * 8 },
    false,
    ["encrypt", "decrypt"],
  );
}

// options: { iterations?: number, keyBytes?: 16|32 }
export async function aesEncrypt(text, password, options = {}) {
  const iterations = Math.max(1, Math.floor(options.iterations ?? LEGACY_ITERATIONS));
  const keyBytes = options.keyBytes === 16 ? 16 : 32;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, iterations, keyBytes);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, te.encode(text)));
  const out = new Uint8Array(5 + 16 + 12 + ct.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, iterations);
  out[4] = keyBytes;
  out.set(salt, 5);
  out.set(iv, 21);
  out.set(ct, 33);
  return PREFIX + b64(out);
}

export async function aesDecrypt(payload, password) {
  const p = payload.trim();
  let iterations = LEGACY_ITERATIONS;
  let keyBytes = 32;
  let salt, iv, ct;
  if (p.startsWith(PREFIX)) {
    const raw = unb64(p.slice(PREFIX.length));
    if (raw.length < 34) throw new Error("payload too short");
    iterations = new DataView(raw.buffer).getUint32(0);
    keyBytes = raw[4];
    salt = raw.slice(5, 21);
    iv = raw.slice(21, 33);
    ct = raw.slice(33);
  } else {
    const raw = unb64(p);
    if (raw.length < 29) throw new Error("payload too short");
    salt = raw.slice(0, 16);
    iv = raw.slice(16, 28);
    ct = raw.slice(28);
  }
  const key = await deriveKey(password, salt, iterations, keyBytes);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return td.decode(pt);
}
