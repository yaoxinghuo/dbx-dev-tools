// ID generators: UUID v4 (native), NanoID, ULID, plus name-based UUID v3/v5.
import { generatePassword } from "./crypto.js";
import md5 from "md5";

const NANOID_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-";
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function nanoid(size = 21) {
  return generatePassword(NANOID_ALPHABET, size);
}

// ULID: 48-bit ms timestamp + 80-bit random, Crockford base32, 26 chars.
// Encoded per spec: time -> 10 chars (50 bits, top 2 zero), rand -> 16 chars.
export function ulid(now = Date.now()) {
  let t = "";
  let v = BigInt(now) << 2n;
  for (let i = 0; i < 10; i++) {
    t = CROCKFORD[Number(v & 31n)] + t;
    v >>= 5n;
  }
  let r = "";
  const rand = crypto.getRandomValues(new Uint8Array(10));
  let acc = 0;
  let bits = 0;
  for (const b of rand) {
    acc = (acc << 8) | b;
    bits += 8;
    while (bits >= 5) {
      r += CROCKFORD[(acc >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  return t + r;
}

export const ID_TYPES = ["uuid", "uuidv5", "uuidv3", "nanoid", "ulid"];

// RFC 4122 §4.3 predefined namespaces for name-based UUIDs.
export const UUID_NAMESPACES = {
  dns: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  url: "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
  oid: "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
  x500: "6ba7b814-9dad-11d1-80b4-00c04fd430c8",
};

export function isUuid(text) {
  return /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(text.trim());
}

function uuidToBytes(text) {
  const hex = text.trim().replaceAll("-", "");
  const out = new Uint8Array(16);
  for (let i = 0; i < 16; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function bytesToUuid(b) {
  const h = [...b].map((v) => v.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// Name-based UUID (RFC 4122): v3 = MD5, v5 = SHA-1, both over
// namespace bytes + name UTF-8. Deterministic — same input, same UUID.
export async function uuidNamed(version, namespace, name) {
  if (!isUuid(namespace) || !name) return null;
  const ns = uuidToBytes(namespace);
  const nm = new TextEncoder().encode(name);
  const data = new Uint8Array(ns.length + nm.length);
  data.set(ns);
  data.set(nm, ns.length);
  const hash =
    version === 5
      ? new Uint8Array(await crypto.subtle.digest("SHA-1", data))
      : new Uint8Array(md5(data, { asBytes: true }));
  const b = hash.slice(0, 16);
  b[6] = (b[6] & 0x0f) | (version << 4);
  b[8] = (b[8] & 0x3f) | 0x80;
  return bytesToUuid(b);
}

export function generateIds(type, count) {
  const gen = type === "nanoid" ? nanoid : type === "ulid" ? () => ulid() : () => crypto.randomUUID();
  return Array.from({ length: count }, () => gen());
}
