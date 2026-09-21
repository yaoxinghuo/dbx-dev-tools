import Home from "../tools/Home.svelte";
import PasswordTool from "../tools/PasswordTool.svelte";
import QrTool from "../tools/QrTool.svelte";
import BarcodeTool from "../tools/BarcodeTool.svelte";
import HashTool from "../tools/HashTool.svelte";
import UuidTool from "../tools/UuidTool.svelte";
import Base64Tool from "../tools/Base64Tool.svelte";
import JwtTool from "../tools/JwtTool.svelte";
import RmbTool from "../tools/RmbTool.svelte";
import UrlTool from "../tools/UrlTool.svelte";
import ImageBase64Tool from "../tools/ImageBase64Tool.svelte";
import TimeTool from "../tools/TimeTool.svelte";
import FileSizeTool from "../tools/FileSizeTool.svelte";
import CounterTool from "../tools/CounterTool.svelte";
import EscapeTool from "../tools/EscapeTool.svelte";
import LoremTool from "../tools/LoremTool.svelte";
import JsonTool from "../tools/JsonTool.svelte";
import DiffTool from "../tools/DiffTool.svelte";
import CaseTool from "../tools/CaseTool.svelte";
import NumBaseTool from "../tools/NumBaseTool.svelte";
import MojibakeTool from "../tools/MojibakeTool.svelte";
import InvisTool from "../tools/InvisTool.svelte";
import DateCalcTool from "../tools/DateCalcTool.svelte";
import ColorTool from "../tools/ColorTool.svelte";
import LinesTool from "../tools/LinesTool.svelte";
import AesTool from "../tools/AesTool.svelte";
import ChmodTool from "../tools/ChmodTool.svelte";
import RegexTool from "../tools/RegexTool.svelte";
import SemverTool from "../tools/SemverTool.svelte";
import ImageCompTool from "../tools/ImageCompTool.svelte";
import RsaTool from "../tools/RsaTool.svelte";
import CertTool from "../tools/CertTool.svelte";
import IpTool from "../tools/IpTool.svelte";
import CronTool from "../tools/CronTool.svelte";
import PunycodeTool from "../tools/PunycodeTool.svelte";
import QpTool from "../tools/QpTool.svelte";
import DataUriTool from "../tools/DataUriTool.svelte";
import SqlInTool from "../tools/SqlInTool.svelte";
import UnicodeTool from "../tools/UnicodeTool.svelte";
import TotpTool from "../tools/TotpTool.svelte";
import PlaceholderTool from "../tools/PlaceholderTool.svelte";

// contributionId -> tool component. `key` indexes i18n strings (t().tools[key]).
// `tags` holds language-independent canonical keys; display names live in
// t().tags so filtering stays stable when the UI language changes.
// Order defines the Home listing: generators → codecs → security → text
// processing → numbers/time → misc.
export const TOOLS = [
  { key: "password", contributionId: "terry.devtools.password", component: PasswordTool, tags: ["security", "generator", "random", "password"] },
  { key: "uuid", contributionId: "terry.devtools.uuid", component: UuidTool, tags: ["generator", "random", "identifier"] },
  { key: "lorem", contributionId: "terry.devtools.lorem", component: LoremTool, tags: ["generator", "text", "test"] },
  { key: "qrcode", contributionId: "terry.devtools.qrcode", component: QrTool, tags: ["generator", "image", "qrcode"] },
  { key: "barcode", contributionId: "terry.devtools.barcode", component: BarcodeTool, tags: ["generator", "barcode"] },
  { key: "base64", contributionId: "terry.devtools.base64", component: Base64Tool, tags: ["codec", "converter", "base64"] },
  { key: "url", contributionId: "terry.devtools.url", component: UrlTool, tags: ["codec", "converter", "url"] },
  { key: "escape", contributionId: "terry.devtools.escape", component: EscapeTool, tags: ["converter", "text", "escape", "xml"] },
  { key: "punycode", contributionId: "terry.devtools.punycode", component: PunycodeTool, tags: ["codec", "converter", "domain", "idn"] },
  { key: "qp", contributionId: "terry.devtools.qp", component: QpTool, tags: ["codec", "converter", "email", "mime"] },
  { key: "datauri", contributionId: "terry.devtools.datauri", component: DataUriTool, tags: ["codec", "converter", "base64", "image"] },
  { key: "sqlin", contributionId: "terry.devtools.sqlin", component: SqlInTool, tags: ["converter", "text", "sql"] },
  { key: "imgb64", contributionId: "terry.devtools.imgb64", component: ImageBase64Tool, tags: ["converter", "image", "base64"] },
  { key: "imgcomp", contributionId: "terry.devtools.imgcomp", component: ImageCompTool, tags: ["converter", "image", "compress"] },
  { key: "placeholder", contributionId: "terry.devtools.placeholder", component: PlaceholderTool, tags: ["generator", "image"] },
  { key: "hash", contributionId: "terry.devtools.hash", component: HashTool, tags: ["hash", "security", "digest", "crypto"] },
  { key: "jwt", contributionId: "terry.devtools.jwt", component: JwtTool, tags: ["security", "parser", "token"] },
  { key: "aes", contributionId: "terry.devtools.aes", component: AesTool, tags: ["security", "crypto"] },
  { key: "rsa", contributionId: "terry.devtools.rsa", component: RsaTool, tags: ["generator", "security", "crypto", "key"] },
  { key: "cert", contributionId: "terry.devtools.cert", component: CertTool, tags: ["security", "parser", "certificate", "x509", "pem"] },
  { key: "totp", contributionId: "terry.devtools.totp", component: TotpTool, tags: ["security", "totp", "otp", "2fa"] },
  { key: "json", contributionId: "terry.devtools.json", component: JsonTool, tags: ["parser", "text", "json"] },
  { key: "diff", contributionId: "terry.devtools.diff", component: DiffTool, tags: ["text", "diff"] },
  { key: "regex", contributionId: "terry.devtools.regex", component: RegexTool, tags: ["text", "regex", "test"] },
  { key: "case", contributionId: "terry.devtools.case", component: CaseTool, tags: ["text", "converter"] },
  { key: "lines", contributionId: "terry.devtools.lines", component: LinesTool, tags: ["text"] },
  { key: "counter", contributionId: "terry.devtools.counter", component: CounterTool, tags: ["text", "counter"] },
  { key: "invisible", contributionId: "terry.devtools.invisible", component: InvisTool, tags: ["text", "debug"] },
  { key: "unicode", contributionId: "terry.devtools.unicode", component: UnicodeTool, tags: ["text", "debug", "unicode"] },
  { key: "mojibake", contributionId: "terry.devtools.mojibake", component: MojibakeTool, tags: ["codec", "chinese", "text"] },
  { key: "time", contributionId: "terry.devtools.time", component: TimeTool, tags: ["converter", "time", "date"] },
  { key: "datecalc", contributionId: "terry.devtools.datecalc", component: DateCalcTool, tags: ["time", "date", "calc"] },
  { key: "cron", contributionId: "terry.devtools.cron", component: CronTool, tags: ["time", "cron", "schedule"] },
  { key: "filesize", contributionId: "terry.devtools.filesize", component: FileSizeTool, tags: ["converter", "filesize", "unit"] },
  { key: "numbase", contributionId: "terry.devtools.numbase", component: NumBaseTool, tags: ["converter", "number", "calc"] },
  { key: "semver", contributionId: "terry.devtools.semver", component: SemverTool, tags: ["calc", "version", "semver", "compare", "sort"] },
  { key: "ipcalc", contributionId: "terry.devtools.ipcalc", component: IpTool, tags: ["calc", "network", "ip", "ipv4", "ipv6", "subnet", "cidr"] },
  { key: "color", contributionId: "terry.devtools.color", component: ColorTool, tags: ["color", "converter", "hex", "rgb", "hsl", "hsv", "contrast", "wcag", "picker"] },
  { key: "chmod", contributionId: "terry.devtools.chmod", component: ChmodTool, tags: ["unix", "security", "calc"] },
  { key: "rmb", contributionId: "terry.devtools.rmb", component: RmbTool, tags: ["converter", "chinese", "number"] },
];

export const HOME_ID = "terry.devtools.home";

// Two-tier tags: category-level tags (shared by 3+ tools) render as filter
// cards and card/detail badges; niche tags stay hidden but remain searchable
// through the multilingual index. Cards are ordered by tool count, biggest
// category first.
const tagCounts = new Map();
for (const tool of TOOLS) for (const tag of tool.tags) tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
export const CATEGORY_TAGS = [...tagCounts.entries()]
  .filter(([, count]) => count >= 3)
  .map(([key, count]) => ({ key, count }))
  .sort((a, b) => b.count - a.count);
export const VISIBLE_TAGS = new Set(CATEGORY_TAGS.map((cat) => cat.key));

// Resolve a tool by its registry key or its manifest contribution id.
export function resolveTool(ref) {
  if (!ref) return null;
  return TOOLS.find((tool) => tool.key === ref || tool.contributionId === ref) || null;
}

export { Home };
