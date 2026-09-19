// ID generators: UUID v4 (native), NanoID, ULID.
import { generatePassword } from "./crypto.js";

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

export const ID_TYPES = ["uuid", "nanoid", "ulid"];

export function generateIds(type, count) {
  const gen = type === "nanoid" ? nanoid : type === "ulid" ? () => ulid() : () => crypto.randomUUID();
  return Array.from({ length: count }, () => gen());
}
