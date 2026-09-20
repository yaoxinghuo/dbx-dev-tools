// Minimal X.509 certificate decoder — hand-rolled ASN.1 DER parser.
// Covers the standard fields: version, serial, signature alg, issuer/subject
// RDNs, validity, SPKI (RSA/EC/Ed25519), SAN, basic constraints, key usage,
// EKU, SKID/AKID, plus SHA-1/SHA-256 fingerprints. Exotic extensions are
// reported as raw OIDs rather than parsed.

const OIDS = {
  // attribute types
  "2.5.4.3": "CN", "2.5.4.6": "C", "2.5.4.7": "L", "2.5.4.8": "ST",
  "2.5.4.10": "O", "2.5.4.11": "OU", "2.5.4.5": "serialNumber",
  "1.2.840.113549.1.9.1": "emailAddress",
  "0.9.2342.19200300.100.1.25": "DC",
  // signature algorithms
  "1.2.840.113549.1.1.5": "sha1WithRSAEncryption",
  "1.2.840.113549.1.1.11": "sha256WithRSAEncryption",
  "1.2.840.113549.1.1.12": "sha384WithRSAEncryption",
  "1.2.840.113549.1.1.13": "sha512WithRSAEncryption",
  "1.2.840.113549.1.1.14": "sha224WithRSAEncryption",
  "1.2.840.113549.1.1.10": "rsassaPss",
  "1.2.840.10045.4.1": "ecdsa-with-SHA1",
  "1.2.840.10045.4.3.2": "ecdsa-with-SHA256",
  "1.2.840.10045.4.3.3": "ecdsa-with-SHA384",
  "1.2.840.10045.4.3.4": "ecdsa-with-SHA512",
  "1.3.101.112": "Ed25519",
  "1.3.101.113": "Ed448",
  // public key algorithms
  "1.2.840.113549.1.1.1": "RSA",
  "1.2.840.10045.2.1": "EC",
  // EC curves
  "1.2.840.10045.3.1.7": "P-256", "1.3.132.0.34": "P-384",
  "1.3.132.0.35": "P-521", "1.3.101.110": "X25519",
  // extensions
  "2.5.29.14": "subjectKeyIdentifier", "2.5.29.15": "keyUsage",
  "2.5.29.17": "subjectAltName", "2.5.29.19": "basicConstraints",
  "2.5.29.31": "cRLDistributionPoints", "2.5.29.32": "certificatePolicies",
  "2.5.29.35": "authorityKeyIdentifier", "2.5.29.37": "extendedKeyUsage",
  "1.3.6.1.5.5.7.1.1": "authorityInfoAccess",
  // EKU purposes
  "1.3.6.1.5.5.7.3.1": "serverAuth", "1.3.6.1.5.5.7.3.2": "clientAuth",
  "1.3.6.1.5.5.7.3.3": "codeSigning", "1.3.6.1.5.5.7.3.4": "emailProtection",
  "1.3.6.1.5.5.7.3.8": "timeStamping", "1.3.6.1.5.5.7.3.9": "OCSPSigning",
};

const oidName = (oid) => OIDS[oid] || oid;

class Der {
  constructor(buf, pos = 0, end = buf.length) {
    this.b = buf;
    this.pos = pos;
    this.end = end;
  }
  // Read one TLV -> { tag, start, end } (start/end are content bounds)
  read() {
    if (this.pos >= this.end) return null;
    const tag = this.b[this.pos++];
    let len = this.b[this.pos++];
    if (len & 0x80) {
      const n = len & 0x7f;
      if (n > 3 || this.pos + n > this.end) throw new Error("bad length");
      len = 0;
      for (let i = 0; i < n; i++) len = (len << 8) | this.b[this.pos++];
    }
    if (this.pos + len > this.end) throw new Error("length overrun");
    const node = { tag, start: this.pos, end: this.pos + len };
    this.pos += len;
    return node;
  }
  sub(node) {
    return new Der(this.b, node.start, node.end);
  }
  bytes(node) {
    return this.b.slice(node.start, node.end);
  }
  *iterAll() {
    let n;
    while ((n = this.read())) yield n;
  }
}

function oidStr(b, node) {
  const d = b.slice(node.start, node.end);
  if (!d.length) return "";
  const first = d[0];
  let out = `${Math.min(2, Math.floor(first / 40))}.${first >= 80 ? first - 80 : first % 40}`;
  let v = 0;
  for (let i = 1; i < d.length; i++) {
    v = (v << 7) | (d[i] & 0x7f);
    if (!(d[i] & 0x80)) {
      out += `.${v}`;
      v = 0;
    }
  }
  return out;
}

function strVal(b, node) {
  const raw = b.slice(node.start, node.end);
  try {
    if (node.tag === 0x1e) {
      // BMPString = UTF-16BE
      let s = "";
      for (let i = 0; i + 1 < raw.length; i += 2) s += String.fromCharCode((raw[i] << 8) | raw[i + 1]);
      return s;
    }
    if (node.tag === 0x14) return [...raw].map((c) => String.fromCharCode(c)).join(""); // T61 ~ latin1
    return new TextDecoder(node.tag === 0x16 || node.tag === 0x13 ? "ascii" : "utf-8").decode(raw);
  } catch {
    return [...raw].map((c) => String.fromCharCode(c)).join("");
  }
}

function timeVal(b, node) {
  const s = strVal(b, node).trim(); // "YYMMDDHHMMSSZ" or "YYYYMMDDHHMMSSZ"
  const m = s.match(/^(\d{2,4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
  if (!m) return null;
  let y = +m[1];
  if (node.tag === 0x17) y += y < 50 ? 2000 : 1900; // UTCTime window per RFC 5280
  return new Date(Date.UTC(y, +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
}

function intBytes(b, node) {
  let d = b.slice(node.start, node.end);
  while (d.length > 1 && d[0] === 0) d = d.slice(1); // strip sign padding
  return d;
}

const hex = (bytes, sep = ":") =>
  [...bytes].map((c) => c.toString(16).padStart(2, "0")).join(sep);

// RDNSequence -> "CN=example.com, O=Org, C=US" (first AVA per set, like openssl oneline)
function nameStr(b, node) {
  const parts = [];
  for (const set of new Der(b, node.start, node.end).iterAll()) {
    const atv = new Der(b, set.start, set.end).read(); // SEQUENCE { oid, value }
    if (!atv) continue;
    const r = new Der(b, atv.start, atv.end);
    const oidN = r.read();
    const val = r.read();
    if (oidN && val) parts.push(`${oidName(oidStr(b, oidN))}=${strVal(b, val)}`);
  }
  return parts.join(", ");
}

function algName(b, node) {
  const r = new Der(b, node.start, node.end);
  const oidN = r.read();
  const params = r.read();
  return { name: oidName(oidN ? oidStr(b, oidN) : "?"), params };
}

// subjectPublicKeyInfo -> "RSA 2048" | "EC P-256" | "Ed25519" | raw oid
function spkiDesc(b, node) {
  const r = new Der(b, node.start, node.end);
  const alg = r.read();
  const bits = r.read();
  if (!alg || !bits) return "?";
  const { name, params } = algName(b, alg);
  if (name === "RSA") {
    // RSAPublicKey ::= SEQUENCE { modulus INTEGER, exponent INTEGER }
    const seq = new Der(b, bits.start + 1, bits.end).read(); // +1 skips bit-count byte
    const mod = seq && new Der(b, seq.start, seq.end).read();
    return mod ? `RSA ${intBytes(b, mod).length * 8}` : "RSA";
  }
  if (name === "EC" && params) return `EC ${oidName(oidStr(b, params))}`;
  return name;
}

// GeneralName inside SAN — dNSName [2], rfc822 [1], URI [6], IP [7]
function sanNames(b, node) {
  const names = [];
  for (const gn of new Der(b, node.start, node.end).iterAll()) {
    const t = gn.tag & 0x1f;
    if (t === 7) {
      const d = b.slice(gn.start, gn.end);
      names.push(d.length === 4 ? [...d].join(".") : `[${hex(d, "")}]`);
    } else if (t === 1 || t === 2 || t === 6) {
      names.push(new TextDecoder().decode(b.slice(gn.start, gn.end)));
    }
  }
  return names;
}

const KU_BITS = ["digitalSignature", "nonRepudiation", "keyEncipherment", "dataEncipherment", "keyAgreement", "keyCertSign", "cRLSign", "encipherOnly", "decipherOnly"];

function parseExtensions(b, node, out) {
  // node = [3] EXPLICIT SEQUENCE OF Extension
  const seq = new Der(b, node.start, node.end).read();
  if (!seq) return;
  for (const ext of new Der(b, seq.start, seq.end).iterAll()) {
    const r = new Der(b, ext.start, ext.end);
    const oidN = r.read();
    if (!oidN) continue;
    const oid = oidStr(b, oidN);
    let next = r.read();
    let critical = false;
    if (next && next.tag === 0x01) {
      critical = next.end > next.start && b[next.start] !== 0;
      next = r.read();
    }
    if (!next || next.tag !== 0x04) continue; // OCTET STRING wrapper
    const val = new Der(b, next.start, next.end);
    if (oid === "2.5.29.17") {
      const s = val.read();
      if (s) out.san = sanNames(b, s);
    } else if (oid === "2.5.29.19") {
      const s = val.read();
      const flag = s && new Der(b, s.start, s.end).read();
      out.isCA = !!(flag && flag.tag === 0x01 && flag.end > flag.start && b[flag.start] !== 0);
      out.isCACritical = critical;
    } else if (oid === "2.5.29.15") {
      const s = val.read();
      if (s && s.tag === 0x03 && s.end > s.start) {
        const bits = b.slice(s.start + 1, s.end);
        out.keyUsage = KU_BITS.filter((_, i) => bits[i >> 3] & (0x80 >> (i & 7)));
      }
    } else if (oid === "2.5.29.37") {
      const s = val.read();
      if (s) out.eku = [...new Der(b, s.start, s.end).iterAll()].map((o) => oidName(oidStr(b, o)));
    } else if (oid === "2.5.29.14") {
      const s = val.read();
      if (s) out.skid = hex(b.slice(s.start, s.end));
    } else if (oid === "2.5.29.35") {
      const s = val.read();
      if (s) {
        const kid = [...new Der(b, s.start, s.end).iterAll()].find((n) => n.tag === 0x80);
        if (kid) out.akid = hex(b.slice(kid.start, kid.end));
      }
    }
  }
}

export function pemToDer(input) {
  const m = input.match(/-----BEGIN CERTIFICATE-----([\s\S]+?)-----END CERTIFICATE-----/);
  if (!m) throw new Error("noPem");
  const bin = atob(m[1].replace(/\s+/g, ""));
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf;
}

// Accepts PEM text or raw DER bytes (paste / .pem .crt .cer .der files).
export function toDer(input) {
  if (typeof input === "string") {
    if (input.includes("BEGIN CERTIFICATE")) return pemToDer(input);
    throw new Error("noPem");
  }
  const buf = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (buf[0] === 0x30) return buf; // DER SEQUENCE
  try {
    return pemToDer(new TextDecoder().decode(buf));
  } catch {
    throw new Error("notCert");
  }
}

// buf: DER bytes (use pemToDer first for PEM input) -> field object
export async function parseCertificate(buf) {
  const top = new Der(buf);
  const cert = top.read();
  if (!cert || cert.tag !== 0x30) throw new Error("notCert");
  const cr = new Der(buf, cert.start, cert.end);
  const tbs = cr.read();
  if (!tbs || tbs.tag !== 0x30) throw new Error("notCert");
  const sigAlgNode = cr.read();

  const out = { san: [] };
  const tr = new Der(buf, tbs.start, tbs.end);
  let n = tr.read();
  if (n && n.tag === 0xa0) {
    const v = new Der(buf, n.start, n.end).read();
    out.version = v ? intBytes(buf, v)[0] + 1 : 1;
    n = tr.read();
  } else {
    out.version = 1;
  }
  out.serial = hex(intBytes(buf, n));
  tr.read(); // tbs signature AlgorithmIdentifier — same as outer, skip
  const issuerN = tr.read();
  out.issuer = nameStr(buf, issuerN);
  const validity = tr.read();
  const vr = new Der(buf, validity.start, validity.end);
  out.notBefore = timeVal(buf, vr.read());
  out.notAfter = timeVal(buf, vr.read());
  const subjectN = tr.read();
  out.subject = nameStr(buf, subjectN);
  const spkiN = tr.read();
  out.publicKey = spkiDesc(buf, spkiN);
  out.selfSigned = out.issuer === out.subject;
  for (const rest of tr.iterAll()) {
    if (rest.tag === 0xa3) parseExtensions(buf, rest, out);
  }
  out.signatureAlgorithm = sigAlgNode ? algName(buf, sigAlgNode).name : "?";

  // Fingerprints hash the whole certificate DER.
  const [sha1, sha256] = await Promise.all([
    crypto.subtle.digest("SHA-1", buf),
    crypto.subtle.digest("SHA-256", buf),
  ]);
  out.fingerprintSha1 = hex(new Uint8Array(sha1));
  out.fingerprintSha256 = hex(new Uint8Array(sha256));
  return out;
}
