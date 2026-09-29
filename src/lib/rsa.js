// RSA keypair generation via WebCrypto, exported as PEM.
// Public key -> SPKI ("BEGIN PUBLIC KEY"), private key -> PKCS#8
// ("BEGIN PRIVATE KEY"). PKCS#1 ("BEGIN RSA PRIVATE KEY") isn't exported
// by WebCrypto; PKCS#8 is accepted by every modern consumer.

export const RSA_ALGS = {
  "RSASSA-PKCS1-v1_5": { hash: "SHA-256", usages: ["sign", "verify"], kind: "sign" },
  "RSA-PSS": { hash: "SHA-256", usages: ["sign", "verify"], kind: "sign" },
  "RSA-OAEP": { hash: "SHA-256", usages: ["encrypt", "decrypt"], kind: "encrypt" },
};

function pem(label, der) {
  const b64 = btoa(String.fromCharCode(...new Uint8Array(der)));
  const lines = b64.match(/.{1,64}/g).join("\n");
  return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----\n`;
}

// -> { publicPem, privatePem }
export async function generateRsaPair(alg, modulusLength) {
  const spec = RSA_ALGS[alg];
  if (!spec) throw new Error(`unknown RSA algorithm: ${alg}`);
  const pair = await crypto.subtle.generateKey(
    { name: alg, modulusLength, publicExponent: new Uint8Array([1, 0, 1]), hash: spec.hash },
    true,
    spec.usages,
  );
  const [spki, pkcs8] = await Promise.all([
    crypto.subtle.exportKey("spki", pair.publicKey),
    crypto.subtle.exportKey("pkcs8", pair.privateKey),
  ]);
  return { publicPem: pem("PUBLIC KEY", spki), privatePem: pem("PRIVATE KEY", pkcs8) };
}

// ---- key import + use ----

const te = new TextEncoder();
const td = new TextDecoder();
const b64 = (bytes) => btoa([...bytes].map((b) => String.fromCharCode(b)).join(""));
const unb64 = (s) => Uint8Array.from(atob(s.trim()), (c) => c.charCodeAt(0));

// Coded errors so the UI can localize them; detail carries dynamic values.
export class RsaError extends Error {
  constructor(code, detail) { super(code); this.code = code; this.detail = detail; }
}

// Accepts PEM (SPKI "PUBLIC KEY" / PKCS#8 "PRIVATE KEY") or a JWK JSON object.
// PKCS#1 "RSA PUBLIC KEY"/"RSA PRIVATE KEY" is not importable by WebCrypto.
export async function importRsaKey(keyText, { alg, hash, usage, need }) {
  const spec = { name: alg, hash };
  const text = keyText.trim();
  let format, der, jwk, type;
  try {
    if (text.startsWith("{")) {
      jwk = JSON.parse(text);
      type = jwk.d ? "private" : "public";
    } else {
      const m = /-----BEGIN ([^-]+)-----([\s\S]+?)-----END \1-----/.exec(text);
      if (!m) throw new Error("not pem");
      der = unb64(m[2].replace(/\s+/g, "")).buffer;
      type = /PRIVATE/.test(m[1]) ? "private" : "public";
      format = type === "private" ? "pkcs8" : "spki";
    }
  } catch {
    throw new RsaError("badkey");
  }
  // Check key kind before importKey — a private key imported with a public
  // usage (or vice versa) would fail with an opaque DataError instead.
  if (need && type !== need) throw new RsaError(need === "private" ? "needpriv" : "needpub");
  try {
    const key = await crypto.subtle.importKey(jwk ? "jwk" : format, jwk ?? der, spec, true, [usage]);
    return { key, type };
  } catch {
    throw new RsaError("badkey");
  }
}

export const RSA_HASHES = ["SHA-256", "SHA-1", "SHA-384", "SHA-512"];
export const RSA_SIGN_ALGS = ["RSASSA-PKCS1-v1_5", "RSA-PSS"];

export async function rsaCrypt(op, text, keyText, hash) {
  if (op === "enc") {
    const { key } = await importRsaKey(keyText, { alg: "RSA-OAEP", hash, usage: "encrypt", need: "public" });
    const max = key.algorithm.modulusLength / 8 - 2 * (key.algorithm.hash.name.match(/\d+/)[0] / 8) - 2;
    const bytes = te.encode(text);
    if (bytes.length > max) throw new RsaError("toolong", max);
    return b64(new Uint8Array(await crypto.subtle.encrypt({ name: "RSA-OAEP" }, key, bytes)));
  }
  const { key } = await importRsaKey(keyText, { alg: "RSA-OAEP", hash, usage: "decrypt", need: "private" });
  return td.decode(await crypto.subtle.decrypt({ name: "RSA-OAEP" }, key, unb64(text)));
}

export async function rsaSign(op, text, sigB64, keyText, alg, hash) {
  const params = alg === "RSA-PSS" ? { name: alg, saltLength: hash.match(/\d+/)[0] / 8 } : { name: alg };
  if (op === "sign") {
    const { key } = await importRsaKey(keyText, { alg, hash, usage: "sign", need: "private" });
    return b64(new Uint8Array(await crypto.subtle.sign(params, key, te.encode(text))));
  }
  const { key } = await importRsaKey(keyText, { alg, hash, usage: "verify", need: "public" });
  return crypto.subtle.verify(params, key, unb64(sigB64), te.encode(text));
}
