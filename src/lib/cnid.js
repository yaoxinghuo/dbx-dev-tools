// Chinese national ID (居民身份证, GB 11643): 6-digit region code +
// 8-digit birth date + 3-digit sequence + 1 checksum digit
// (ISO 7064 MOD 11-2). Sequence parity encodes gender: odd = male.
//
// Region table holds first-level province codes plus each province's
// capital/prefecture-level code — real GB/T 2260 assignments, enough for
// realistic test data without shipping the full ~3000-entry county table.
export const REGIONS = [
  { zh: "北京", en: "Beijing", codes: ["110000", "110100"] },
  { zh: "天津", en: "Tianjin", codes: ["120000", "120100"] },
  { zh: "河北", en: "Hebei", codes: ["130000", "130100"] },
  { zh: "山西", en: "Shanxi", codes: ["140000", "140100"] },
  { zh: "内蒙古", en: "Inner Mongolia", codes: ["150000", "150100"] },
  { zh: "辽宁", en: "Liaoning", codes: ["210000", "210100"] },
  { zh: "吉林", en: "Jilin", codes: ["220000", "220100"] },
  { zh: "黑龙江", en: "Heilongjiang", codes: ["230000", "230100"] },
  { zh: "上海", en: "Shanghai", codes: ["310000", "310100"] },
  { zh: "江苏", en: "Jiangsu", codes: ["320000", "320100"] },
  { zh: "浙江", en: "Zhejiang", codes: ["330000", "330100"] },
  { zh: "安徽", en: "Anhui", codes: ["340000", "340100"] },
  { zh: "福建", en: "Fujian", codes: ["350000", "350100"] },
  { zh: "江西", en: "Jiangxi", codes: ["360000", "360100"] },
  { zh: "山东", en: "Shandong", codes: ["370000", "370100"] },
  { zh: "河南", en: "Henan", codes: ["410000", "410100"] },
  { zh: "湖北", en: "Hubei", codes: ["420000", "420100"] },
  { zh: "湖南", en: "Hunan", codes: ["430000", "430100"] },
  { zh: "广东", en: "Guangdong", codes: ["440000", "440100"] },
  { zh: "广西", en: "Guangxi", codes: ["450000", "450100"] },
  { zh: "海南", en: "Hainan", codes: ["460000", "460100"] },
  { zh: "重庆", en: "Chongqing", codes: ["500000", "500101"] },
  { zh: "四川", en: "Sichuan", codes: ["510000", "510100"] },
  { zh: "贵州", en: "Guizhou", codes: ["520000", "520100"] },
  { zh: "云南", en: "Yunnan", codes: ["530000", "530100"] },
  { zh: "西藏", en: "Tibet", codes: ["540000", "540100"] },
  { zh: "陕西", en: "Shaanxi", codes: ["610000", "610100"] },
  { zh: "甘肃", en: "Gansu", codes: ["620000", "620100"] },
  { zh: "青海", en: "Qinghai", codes: ["630000", "630100"] },
  { zh: "宁夏", en: "Ningxia", codes: ["640000", "640100"] },
  { zh: "新疆", en: "Xinjiang", codes: ["650000", "650100"] },
  { zh: "台湾", en: "Taiwan", codes: ["710000"] },
  { zh: "香港", en: "Hong Kong", codes: ["810000"] },
  { zh: "澳门", en: "Macau", codes: ["820000"] },
];

const WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
const CHECK_DIGITS = "10X98765432";

function checksumDigit(body17) {
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += (body17.charCodeAt(i) - 48) * WEIGHTS[i];
  return CHECK_DIGITS[sum % 11];
}

function rand(n) {
  return Math.floor(Math.random() * n);
}

function pad(n, w) {
  return String(n).padStart(w, "0");
}

function isRealDate(y, m, d) {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function formatDate(dt) {
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1, 2)}-${pad(dt.getDate(), 2)}`;
}

// A random date on which the person is exactly `age` years old today:
// born after their (age+1)-th birthday and on/before their age-th birthday.
function randomDateForAge(age) {
  const now = new Date();
  const hi = new Date(now.getFullYear() - age, now.getMonth(), now.getDate());
  const lo = new Date(now.getFullYear() - age - 1, now.getMonth(), now.getDate() + 1);
  return new Date(lo.getTime() + rand(Math.max(1, Math.round((hi - lo) / 86400000) + 1)) * 86400000);
}

function pickRegionCode(regionIdx) {
  const region = regionIdx < 0 ? REGIONS[rand(REGIONS.length)] : REGIONS[regionIdx];
  return { region, code: region.codes[rand(region.codes.length)] };
}

function pickSeq(gender) {
  // 500 odd + 499 even values in 001..999; "000" is skipped so every
  // sequence is a plausible issued number.
  if (gender === "male") return 2 * rand(500) + 1;
  if (gender === "female") return 2 * rand(499) + 2;
  return rand(999) + 1;
}

// opts: { region: -1|index, birth: "random"|"age"|"date", age, date, gender: "any"|"male"|"female", count }
export function generateIds(opts) {
  const n = Math.min(Math.max(1, opts.count | 0), 500);
  const out = [];
  for (let i = 0; i < n; i++) {
    const { code } = pickRegionCode(opts.region ?? -1);
    let dt;
    if (opts.birth === "date") {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(opts.date || "");
      if (!m || !isRealDate(+m[1], +m[2], +m[3])) return null;
      dt = new Date(+m[1], +m[2] - 1, +m[3]);
      if (dt > new Date()) return null;
    } else {
      const age = opts.birth === "age" ? Math.min(Math.max(0, opts.age | 0), 120) : 18 + rand(43);
      dt = randomDateForAge(age);
    }
    const body = `${code}${dt.getFullYear()}${pad(dt.getMonth() + 1, 2)}${pad(dt.getDate(), 2)}${pad(pickSeq(opts.gender), 3)}`;
    out.push(body + checksumDigit(body));
  }
  return out;
}

// Parses and validates an ID. Returns { valid, legacy?, errors: string[],
// parsed?: { region, regionName: {zh,en}, birth, age, gender, seq, checksum } }.
export function validateId(raw) {
  const id = String(raw || "").trim().toUpperCase();
  const fail = (errors) => ({ valid: false, errors });
  if (/^\d{15}$/.test(id)) {
    const parsed = parseBody(id.slice(0, 6), "19" + id.slice(6, 12), id.slice(12, 15));
    if (!parsed) return fail(["date"]);
    // Upgrade path: insert century digits and recompute the checksum.
    const body = `${id.slice(0, 6)}19${id.slice(6)}`;
    return { valid: true, legacy: true, upgraded: body + checksumDigit(body), errors: [], parsed };
  }
  if (!/^[0-9]{17}[0-9X]$/.test(id)) return fail(["format"]);
  const parsed = parseBody(id.slice(0, 6), id.slice(6, 14), id.slice(14, 17));
  const errors = [];
  if (!parsed) errors.push("date");
  if (checksumDigit(id.slice(0, 17)) !== id[17]) errors.push("checksum");
  if (errors.length) return fail(errors);
  return { valid: true, errors: [], parsed };
}

function parseBody(regionCode, ymd, seqStr) {
  const y = +ymd.slice(0, 4);
  const m = +ymd.slice(4, 6);
  const d = +ymd.slice(6, 8);
  if (!isRealDate(y, m, d)) return null;
  const birth = new Date(y, m - 1, d);
  const today = new Date();
  if (birth > today) return null;
  let age = today.getFullYear() - y;
  const hadBirthday = today.getMonth() > m - 1 || (today.getMonth() === m - 1 && today.getDate() >= d);
  if (!hadBirthday) age--;
  const seq = +seqStr;
  const region = REGIONS.find((r) => regionCode.startsWith(r.codes[0].slice(0, 2)));
  return {
    region: regionCode,
    regionName: region ? { zh: region.zh, en: region.en } : null,
    birth: formatDate(birth),
    age,
    gender: seq % 2 === 1 ? "male" : "female",
    seq: seqStr,
  };
}
