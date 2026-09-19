import md5 from "md5";

// Rejection sampling: draw from a crypto RNG but discard values that would
// make index % charset.length non-uniform (modulo bias).
export function generatePassword(charset, length) {
  if (!charset.length || length <= 0) return "";
  const maxValid = Math.floor(256 / charset.length) * charset.length;
  const out = new Array(length);
  let filled = 0;
  while (filled < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length - filled + 16));
    for (const byte of bytes) {
      if (byte >= maxValid) continue;
      out[filled++] = charset[byte % charset.length];
      if (filled === length) break;
    }
  }
  return out.join("");
}

export function entropyBits(charsetSize, length) {
  return Math.round(length * Math.log2(Math.max(charsetSize, 1)));
}

const SHA_ALGOS = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"];

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Returns [{ name, hex }] for MD5 + the WebCrypto SHA family.
export async function hashText(text) {
  const bytes = new TextEncoder().encode(text);
  const results = [{ name: "MD5", hex: md5(text) }];
  for (const algo of SHA_ALGOS) {
    const digest = await crypto.subtle.digest(algo, bytes);
    results.push({ name: algo, hex: toHex(digest) });
  }
  return results;
}

// Same set, on a binary buffer (file hashing).
export async function hashBuffer(buffer) {
  const results = [{ name: "MD5", hex: md5(new Uint8Array(buffer)) }];
  for (const algo of SHA_ALGOS) {
    const digest = await crypto.subtle.digest(algo, buffer);
    results.push({ name: algo, hex: toHex(digest) });
  }
  return results;
}

// HMAC needs WebCrypto keys — MD5 is not in the spec, so SHA family only.
export async function hmacBuffer(buffer, keyText) {
  const keyBytes = new TextEncoder().encode(keyText);
  const results = [];
  for (const algo of SHA_ALGOS) {
    const key = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "HMAC", hash: { name: algo } },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, buffer);
    results.push({ name: `HMAC-${algo}`, hex: toHex(sig) });
  }
  return results;
}
