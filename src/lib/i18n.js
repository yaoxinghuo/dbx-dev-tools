import { locale, onEnvChange, onInit } from "./bridge.js";

const messages = {
  en: {
    homeTitle: "Dev Tools",
    homeSubtitle: "A collection of small tools for everyday development.",
    open: "Open",
    copy: "Copy",
    copied: "Copied",
    copyAll: "Copy all",
    regenerate: "Regenerate",
    generate: "Generate",
    downloadSvg: "Save SVG",
    downloadPng: "Save PNG",
    input: "Input",
    output: "Output",
    tools: {
      password: { name: "Password Generator", desc: "Cryptographically secure passwords with custom rules." },
      qrcode: { name: "QR Code Generator", desc: "Turn text or URLs into QR codes." },
      barcode: { name: "Barcode Generator", desc: "CODE-128 barcodes as SVG or PNG." },
      hash: { name: "Hash Generator", desc: "MD5, SHA-1, SHA-256, SHA-384, SHA-512 digests." },
      uuid: { name: "UUID Generator", desc: "Random v4 UUIDs in bulk." },
      base64: { name: "Base64 Encoder / Decoder", desc: "UTF-8 safe Base64 encode and decode." },
      jwt: { name: "JWT Parser", desc: "Decode JWT header/payload, inspect claims, verify HS signatures." },
      rmb: { name: "RMB Uppercase", desc: "Numeric amount to Chinese RMB uppercase." },
      url: { name: "URL Encoder / Decoder", desc: "URL encode/decode with query parameter breakdown." },
      imgb64: { name: "Image ⇄ Base64", desc: "Convert images to Base64 and back, with preview and export." },
    },
    password: {
      length: "Length",
      count: "Count",
      lowercase: "Lowercase (a-z)",
      uppercase: "Uppercase (A-Z)",
      digits: "Digits (0-9)",
      symbols: "Symbols",
      customSymbols: "Custom symbols",
      excludeAmbiguous: "Exclude ambiguous (Il1O0)",
      strength: "Entropy",
      bits: "bits",
      pickCharset: "Select at least one character set",
    },
    qr: {
      content: "Content",
      ecLevel: "Error correction",
      scale: "Module size",
      margin: "Quiet zone",
      placeholder: "Text or URL to encode…",
      tooLong: "Content too long for a QR code (max ~700 bytes at this level)",
      invalid: "Unable to encode content",
    },
    barcode: {
      content: "Content",
      placeholder: "Printable ASCII to encode…",
      barWidth: "Bar width",
      height: "Height",
      showText: "Show text",
      invalid: "CODE-128 B supports printable ASCII only (space through ~)",
      empty: "Enter some content first",
    },
    hash: {
      placeholder: "Text to hash…",
      uppercase: "Uppercase",
    },
    uuid: {
      count: "Count",
      uppercase: "Uppercase",
      hyphens: "Hyphens",
    },
    base64: {
      encode: "Encode",
      decode: "Decode",
      urlSafe: "URL-safe",
      encodePlaceholder: "Text to encode…",
      decodePlaceholder: "Base64 to decode…",
      invalid: "Invalid Base64 input",
    },
    jwt: {
      placeholder: "Paste a JWT…",
      header: "Header",
      payload: "Payload",
      signature: "Signature",
      invalid: "Invalid JWT (expected 3 base64url parts)",
      secret: "Secret (HS256/384/512)",
      verify: "Verify",
      valid: "Signature valid",
      badSig: "Signature invalid",
      unsupported: "alg not supported for verify (HS* only)",
      expired: "Expired",
      notYet: "Not yet valid",
      validUntil: "Valid",
    },
    rmb: {
      amount: "Amount (CNY)",
      placeholder: "e.g. 12345.67",
      result: "Uppercase",
      invalid: "Enter a number with at most 4 decimals (< 10^15)",
    },
    url: {
      encode: "Encode",
      decode: "Decode",
      component: "Component",
      full: "Full URL",
      plusSpace: "space ↔ + (form)",
      inputPlaceholder: "Text or URL…",
      output: "Output",
      invalid: "Unable to decode input",
      params: "Query parameters",
    },
    imgb64: {
      encode: "Image → Base64",
      decode: "Base64 → Image",
      dropHint: "Drop an image here, paste from clipboard, or",
      chooseFile: "choose a file",
      dataUri: "Include data URI prefix",
      notImage: "Please pick an image file",
      pastePlaceholder: "Paste Base64 or a data URI…",
      invalid: "Invalid Base64 image data",
      preview: "Preview",
      download: "Download",
    },
  },
  zh: {
    homeTitle: "Dev Tools",
    homeSubtitle: "日常开发工具集合。",
    open: "打开",
    copy: "复制",
    copied: "已复制",
    copyAll: "全部复制",
    regenerate: "重新生成",
    generate: "生成",
    downloadSvg: "保存 SVG",
    downloadPng: "保存 PNG",
    input: "输入",
    output: "输出",
    tools: {
      password: { name: "密码生成器", desc: "按规则生成加密安全的随机密码。" },
      qrcode: { name: "二维码生成器", desc: "将文本或链接生成二维码。" },
      barcode: { name: "条码生成器", desc: "生成 CODE-128 条码，支持导出。" },
      hash: { name: "Hash 生成器", desc: "计算 MD5、SHA-1/256/384/512 摘要。" },
      uuid: { name: "UUID 生成器", desc: "批量生成随机 v4 UUID。" },
      base64: { name: "Base64 编解码", desc: "支持 UTF-8 的 Base64 编码与解码。" },
      jwt: { name: "JWT 解析", desc: "解码 JWT header/payload，检查声明，校验 HS 签名。" },
      rmb: { name: "人民币大写", desc: "数字金额转人民币大写。" },
      url: { name: "URL 编解码", desc: "URL 编码/解码，含查询参数拆解。" },
      imgb64: { name: "图片 ⇄ Base64", desc: "图片与 Base64 互转，支持预览与导出。" },
    },
    password: {
      length: "长度",
      count: "数量",
      lowercase: "小写字母 (a-z)",
      uppercase: "大写字母 (A-Z)",
      digits: "数字 (0-9)",
      symbols: "符号",
      customSymbols: "自定义符号",
      excludeAmbiguous: "排除易混淆字符 (Il1O0)",
      strength: "熵",
      bits: "位",
      pickCharset: "请至少选择一种字符集",
    },
    qr: {
      content: "内容",
      ecLevel: "容错级别",
      scale: "模块大小",
      margin: "静区",
      placeholder: "要编码的文本或链接…",
      tooLong: "内容过长，当前容错级别下超出二维码容量（约 700 字节）",
      invalid: "无法编码该内容",
    },
    barcode: {
      content: "内容",
      placeholder: "要编码的可打印 ASCII…",
      barWidth: "条宽",
      height: "高度",
      showText: "显示文字",
      invalid: "CODE-128 B 仅支持可打印 ASCII（空格 到 ~）",
      empty: "请先输入内容",
    },
    hash: {
      placeholder: "要计算哈希的文本…",
      uppercase: "大写",
    },
    uuid: {
      count: "数量",
      uppercase: "大写",
      hyphens: "连字符",
    },
    base64: {
      encode: "编码",
      decode: "解码",
      urlSafe: "URL 安全",
      encodePlaceholder: "要编码的文本…",
      decodePlaceholder: "要解码的 Base64…",
      invalid: "Base64 输入无效",
    },
    jwt: {
      placeholder: "粘贴 JWT…",
      header: "Header",
      payload: "Payload",
      signature: "签名",
      invalid: "无效的 JWT（应为三段 base64url）",
      secret: "密钥 (HS256/384/512)",
      verify: "校验",
      valid: "签名有效",
      badSig: "签名无效",
      unsupported: "该 alg 不支持校验（仅 HS*）",
      expired: "已过期",
      notYet: "未生效",
      validUntil: "有效",
    },
    rmb: {
      amount: "金额（元）",
      placeholder: "如 12345.67",
      result: "大写",
      invalid: "请输入数字，最多 4 位小数（< 10^15）",
    },
    url: {
      encode: "编码",
      decode: "解码",
      component: "组件",
      full: "完整 URL",
      plusSpace: "空格 ↔ +（表单）",
      inputPlaceholder: "文本或 URL…",
      output: "输出",
      invalid: "无法解码输入",
      params: "查询参数",
    },
    imgb64: {
      encode: "图片 → Base64",
      decode: "Base64 → 图片",
      dropHint: "拖拽图片到这里、从剪贴板粘贴，或",
      chooseFile: "选择文件",
      dataUri: "包含 data URI 前缀",
      notImage: "请选择图片文件",
      pastePlaceholder: "粘贴 Base64 或 data URI…",
      invalid: "Base64 图片数据无效",
      preview: "预览",
      download: "下载",
    },
  },
};

function detect() {
  return locale().toLowerCase().startsWith("zh") ? "zh" : "en";
}
let currentLang = detect();
const subscribers = new Set();

// Re-detect on both init (real locale arrives) and env pushes (locale changes).
function update() {
  const next = detect();
  if (next !== currentLang) {
    currentLang = next;
    for (const fn of subscribers) fn(currentLang);
  }
}
onEnvChange(update);
onInit(update);

export function lang() {
  return currentLang;
}

export function onLangChange(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function t() {
  return messages[currentLang];
}
