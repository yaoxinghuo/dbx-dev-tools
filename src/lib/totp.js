// RFC 6238 TOTP via WebCrypto HMAC — no dependencies, no storage.

export function base32ToBytes(secret) {
  const clean = secret.toUpperCase().replace(/[\s=-]/g, "");
  if (!clean) return new Uint8Array(0);
  let bits = 0, value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(ch);
    if (idx < 0) throw new Error("invalid base32 secret");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

export function parseOtpauth(uri) {
  try {
    const url = new URL(uri.trim());
    if (url.protocol !== "otpauth:" || url.host.toLowerCase() !== "totp") return null;
    const secret = url.searchParams.get("secret");
    if (!secret) return null;
    return {
      secret,
      issuer: url.searchParams.get("issuer") || "",
      account: decodeURIComponent(url.pathname.replace(/^\//, "")),
      digits: clamp(Number(url.searchParams.get("digits")) || 6, 6, 8),
      period: clamp(Number(url.searchParams.get("period")) || 30, 1, 600),
      algorithm: (url.searchParams.get("algorithm") || "SHA1").toUpperCase(),
    };
  } catch {
    return null;
  }
}

function clamp(v, min, max) {
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : min;
}

// RFC 4226 HOTP with dynamic truncation.
export async function totp(secretBytes, algorithm, digits, period, atMs = Date.now()) {
  const counter = Math.floor(atMs / 1000 / period);
  const msg = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    msg[i] = c & 255;
    c = Math.floor(c / 256);
  }
  const hashName = algorithm === "SHA256" || algorithm === "SHA512" ? `SHA-${algorithm.slice(3)}` : "SHA-1";
  const key = await crypto.subtle.importKey("raw", secretBytes, { name: "HMAC", hash: hashName }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg));
  const offset = sig[sig.length - 1] & 15;
  const bin = ((sig[offset] & 127) << 24) | (sig[offset + 1] << 16) | (sig[offset + 2] << 8) | sig[offset + 3];
  return { code: String(bin % 10 ** digits).padStart(digits, "0"), expiresAt: (counter + 1) * period * 1000 };
}
