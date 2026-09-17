const CN_NUMS = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"];
const CN_INT_RADICE = ["", "拾", "佰", "仟"];
const CN_INT_UNITS = ["", "万", "亿", "兆"];
const CN_DEC_UNITS = ["角", "分", "毫", "厘"];
const CN_INTEGER = "整";
const CN_INT_LAST = "圆";
const MAX_NUM = 999999999999999.9999;

// Convert a numeric CNY amount to its official uppercase form. Returns null
// when out of range; throws TypeError for non-numeric input.
export function rmbUppercase(money) {
  const negative = money < 0;
  money = Math.abs(money);
  if (!Number.isFinite(money) || money >= MAX_NUM) return null;
  if (money === 0) return (negative ? "负" : "") + CN_NUMS[0] + CN_INT_LAST + CN_INTEGER;

  const str = money.toString();
  const dot = str.indexOf(".");
  const integerNum = dot === -1 ? str : str.slice(0, dot);
  const decimalNum = dot === -1 ? "" : str.slice(dot + 1, dot + 5);

  // Group digits by 4 (万/亿/兆 boundaries); a zero run collapses into a single
  // 零 and suppresses the group unit only when it spans the whole group.
  let chineseStr = negative ? "负" : "";
  if (parseInt(integerNum, 10) > 0) {
    let zeroCount = 0;
    for (let i = 0; i < integerNum.length; i++) {
      const n = integerNum.charAt(i);
      const p = integerNum.length - i - 1;
      const q = Math.floor(p / 4);
      const m = p % 4;
      if (n === "0") zeroCount++;
      else {
        if (zeroCount > 0) chineseStr += CN_NUMS[0];
        zeroCount = 0;
        chineseStr += CN_NUMS[parseInt(n, 10)] + CN_INT_RADICE[m];
      }
      if (m === 0 && zeroCount < 4) chineseStr += CN_INT_UNITS[q];
      // Crossing a 万/亿/兆 boundary consumes the pending zero run: without a
      // reset it would be re-emitted as a spurious 零 inside the next group
      // (e.g. 10,1001,0000 → 壹拾亿壹仟零壹万, not 壹拾亿零壹仟零壹万).
      if (m === 0) zeroCount = 0;
    }
    chineseStr += CN_INT_LAST;
  }
  // A 0 in the 角 place followed by a nonzero 分/毫/厘 still reads 零 when an
  // integer part was emitted (¥2000.03 → 贰仟圆零叁分); without an integer
  // part the leading zero is silent (¥0.03 → 叁分).
  let decZero = parseInt(integerNum, 10) > 0 && /^0+[1-9]/.test(decimalNum);
  for (let i = 0; i < decimalNum.length; i++) {
    const n = decimalNum.charAt(i);
    if (n === "0") continue;
    if (decZero) {
      chineseStr += CN_NUMS[0];
      decZero = false;
    }
    chineseStr += CN_NUMS[Number(n)] + CN_DEC_UNITS[i];
  }
  if (chineseStr === (negative ? "负" : "")) chineseStr += CN_NUMS[0] + CN_INT_LAST;
  if (!decimalNum || /^0*$/.test(decimalNum)) chineseStr += CN_INTEGER;
  return chineseStr;
}
