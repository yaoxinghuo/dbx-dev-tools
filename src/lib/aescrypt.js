// AES-GCM with PBKDF2 key derivation. Async (WebCrypto).
// Wire format: base64( salt(16) | iv(12) | ciphertext+tag ).

const ITERATIONS = 100_000;
const te = new TextEncoder();
const td = new TextDecoder();

async function deriveKey(password, salt) {
  const base = await crypto.subtle.importKey("raw", te.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
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

export async function aesEncrypt(text, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, te.encode(text)));
  const out = new Uint8Array(16 + 12 + ct.length);
  out.set(salt, 0);
  out.set(iv, 16);
  out.set(ct, 28);
  return b64(out);
}

export async function aesDecrypt(payload, password) {
  const raw = unb64(payload);
  if (raw.length < 29) throw new Error("payload too short");
  const key = await deriveKey(password, raw.slice(0, 16));
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: raw.slice(16, 28) },
    key,
    raw.slice(28),
  );
  return td.decode(pt);
}
