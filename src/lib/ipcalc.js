// IPv4 subnet + IPv6 address utilities. Pure BigInt math, no deps.

const ipv4Re = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

export function parseIpv4(s) {
  const m = s.trim().match(ipv4Re);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  if (parts.some((p) => p > 255)) return null;
  return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
}

const ip4 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
const mask4 = (bits) => (bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0);

// "10.0.0.1/24" | "10.0.0.1 255.255.255.0" | "10.0.0.1" -> { ip, bits } | null
export function parseIpv4Input(input) {
  const t = input.trim();
  let m = t.match(/^(\S+)\s*\/\s*(\d{1,2})$/);
  if (m) {
    const ip = parseIpv4(m[1]);
    const bits = +m[2];
    return ip !== null && bits >= 0 && bits <= 32 ? { ip, bits } : null;
  }
  m = t.match(/^(\S+)\s+(\S+)$/);
  if (m) {
    const ip = parseIpv4(m[1]);
    const mask = parseIpv4(m[2]);
    if (ip === null || mask === null) return null;
    // mask must be contiguous 1s then 0s
    const inv = ~mask >>> 0;
    if ((inv & (inv + 1)) >>> 0 !== 0) return null;
    return { ip, bits: 32 - Math.log2(inv + 1) };
  }
  const ip = parseIpv4(t);
  return ip !== null ? { ip, bits: 32 } : null;
}

const V4_RANGES = [
  ["0.0.0.0/8", "thisNetwork"], ["10.0.0.0/8", "private"], ["100.64.0.0/10", "cgnat"],
  ["127.0.0.0/8", "loopback"], ["169.254.0.0/16", "linkLocal"], ["172.16.0.0/12", "private"],
  ["192.0.0.0/24", "ietfProtocol"], ["192.0.2.0/24", "documentation"], ["192.168.0.0/16", "private"],
  ["198.18.0.0/15", "benchmark"], ["198.51.100.0/24", "documentation"], ["203.0.113.0/24", "documentation"],
  ["224.0.0.0/4", "multicast"], ["240.0.0.0/4", "reserved"],
];

function v4Scope(ip) {
  for (const [cidr, key] of V4_RANGES) {
    const { ip: base, bits } = parseIpv4Input(cidr);
    if ((ip & mask4(bits)) >>> 0 === (base & mask4(bits)) >>> 0) return key;
  }
  return "public";
}

export function ipv4Info(ip, bits) {
  const mask = mask4(bits);
  const network = (ip & mask) >>> 0;
  const broadcast = (network | ~mask) >>> 0;
  const total = 2 ** (32 - bits);
  const usable = bits >= 31 ? total : total - 2; // /31 p2p & /32 host: all usable
  const firstOctet = ip >>> 24;
  const cls = firstOctet < 128 ? "A" : firstOctet < 192 ? "B" : firstOctet < 224 ? "C" : firstOctet < 240 ? "D" : "E";
  const maskStr = ip4(mask);
  return {
    ip: ip4(ip),
    bits,
    cidr: `${ip4(network)}/${bits}`,
    network: ip4(network),
    broadcast: ip4(broadcast),
    mask: maskStr,
    wildcard: ip4(~mask >>> 0),
    firstHost: bits >= 31 ? ip4(network) : ip4(network + 1),
    lastHost: bits >= 31 ? ip4(broadcast) : ip4(broadcast - 1),
    total,
    usable,
    cls,
    scope: v4Scope(ip),
    ptr: `${ip4(ip).split(".").reverse().join(".")}.in-addr.arpa`,
    ipInt: ip >>> 0,
    maskBin: mask.toString(2).padStart(32, "0"),
    hostsNote: bits === 32 ? "single" : bits === 31 ? "p2p" : null,
  };
}

// Split ip/bits into newBits subnets -> array of {cidr, range, hosts} capped at max
export function ipv4Split(ip, bits, newBits, max = 256) {
  const mask = mask4(bits);
  const base = (ip & mask) >>> 0;
  const count = 2 ** (newBits - bits);
  const step = 2 ** (32 - newBits);
  const out = [];
  for (let i = 0; i < Math.min(count, max); i++) {
    const n = (base + i * step) >>> 0;
    const b = (n + step - 1) >>> 0;
    out.push({
      cidr: `${ip4(n)}/${newBits}`,
      range: newBits >= 31 ? `${ip4(n)} – ${ip4(b)}` : `${ip4(n + 1)} – ${ip4(b - 1)}`,
      hosts: newBits >= 31 ? step : step - 2,
    });
  }
  return { rows: out, totalSubnets: count, truncated: count > max };
}

// ---------- IPv6 ----------

export function parseIpv6(s) {
  let t = s.trim().toLowerCase();
  if (!/^[0-9a-f:.]+$/.test(t)) return null;
  // embedded IPv4 tail expands to two hextets
  const v4m = t.match(/^(.*):(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (v4m) {
    const v4 = parseIpv4(v4m[2]);
    if (v4 === null) return null;
    t = `${v4m[1]}:${((v4 >>> 16) & 0xffff).toString(16)}:${(v4 & 0xffff).toString(16)}`;
  }
  const halves = t.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  if (halves.length === 1 && head.length !== 8) return null;
  if (head.length + tail.length > 8) return null;
  const groups = [...head, ...Array(8 - head.length - tail.length).fill("0"), ...tail];
  if (groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  return groups.reduce((acc, g) => (acc << 16n) | BigInt(`0x${g}`), 0n);
}

// RFC 5952 canonical: lowercase, longest zero run (>=2) -> "::"
export function fmtIpv6(addr, { compress = true } = {}) {
  const g = [];
  for (let i = 0; i < 8; i++) g.push(Number((addr >> BigInt(16 * (7 - i))) & 0xffffn));
  if (!compress) return g.map((x) => x.toString(16).padStart(4, "0")).join(":");
  let best = -1, bestLen = 0, cur = -1;
  for (let i = 0; i <= 8; i++) {
    if (i < 8 && g[i] === 0) {
      if (cur < 0) cur = i;
      if (i - cur + 1 > bestLen) { best = cur; bestLen = i - cur + 1; }
    } else cur = -1;
  }
  if (bestLen < 2) return g.map((x) => x.toString(16)).join(":");
  const left = g.slice(0, best).map((x) => x.toString(16)).join(":");
  const right = g.slice(best + bestLen).map((x) => x.toString(16)).join(":");
  return `${left}::${right}`;
}

const V6_TYPES = [
  [0n, 128, "unspecified"], [1n, 128, "loopback"],
  [0xffn << 120n, 8, "multicast"],
  [0xfe80n << 112n, 10, "linkLocal"],
  [0xfc00n << 120n, 7, "ula"],
  [0x20010db8n << 96n, 32, "documentation"],
  [0x20010000n << 96n, 32, "teredo"],
  [0x2002n << 112n, 16, "6to4"],
  [0xffffn << 32n, 96, "ipv4Mapped"], // ::ffff:0:0/96 → top 80 bits zero checked below
];

function v6Type(addr) {
  // IPv4-mapped: top 80 bits zero + ffff
  if (addr >> 32n === 0xffffn) return "ipv4Mapped";
  for (const [base, bits, key] of V6_TYPES) {
    if (key === "ipv4Mapped") continue;
    if ((addr >> (128n - BigInt(bits))) === base >> (128n - BigInt(bits))) return key;
  }
  return "global";
}

export function ipv6Info(addr, bits = 64) {
  const shift = 128n - BigInt(bits);
  const network = (addr >> shift) << shift;
  const last = network | ((1n << shift) - 1n);
  // ip6.arpa PTR = full nibble expansion reversed
  const nibbles = fmtIpv6(addr, { compress: false }).replaceAll(":", "");
  return {
    compressed: fmtIpv6(addr),
    expanded: fmtIpv6(addr, { compress: false }),
    prefix: `${fmtIpv6(network)}/${bits}`,
    first: fmtIpv6(network),
    last: fmtIpv6(last),
    bits,
    type: v6Type(addr),
    ptr: [...nibbles].reverse().join(".") + ".ip6.arpa",
    ipv4Mapped: addr >> 32n === 0xffffn ? ip4(Number(addr & 0xffffffffn)) : null,
  };
}

// Input: "addr[/bits]" where addr may be v6; v4 handled separately
export function parseIpv6Input(input) {
  const t = input.trim();
  const m = t.match(/^(.*)\s*\/\s*(\d{1,3})$/);
  const addr = parseIpv6(m ? m[1] : t);
  if (addr === null) return null;
  const bits = m ? +m[2] : 128;
  return bits >= 0 && bits <= 128 ? { addr, bits } : null;
}
