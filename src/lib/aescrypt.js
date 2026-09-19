// AES-GCM with PBKDF2 key derivation. Async (WebCrypto).
// Wire format v1: "A1:" + base64( iter(4B BE) | keyBytes(1B) | salt(16) | iv(12) | ciphertext+tag )
// Legacy payloads (bare base64 of salt|iv|ct, 100k iterations, AES-256) still decrypt.

const PREFIX = "A1:";
const LEGACY_ITERATIONS = 100_000;
const te = new TextEncoder();
const td = new TextDecoder();

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

function b64(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function unb64(s) {
  const bin = atob(s.trim());
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
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
