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
  { key: "imgb64", contributionId: "terry.devtools.imgb64", component: ImageBase64Tool, tags: ["converter", "image", "base64"] },
  { key: "hash", contributionId: "terry.devtools.hash", component: HashTool, tags: ["hash", "security", "digest", "crypto"] },
  { key: "jwt", contributionId: "terry.devtools.jwt", component: JwtTool, tags: ["security", "parser", "token"] },
  { key: "aes", contributionId: "terry.devtools.aes", component: AesTool, tags: ["security", "crypto"] },
  { key: "json", contributionId: "terry.devtools.json", component: JsonTool, tags: ["parser", "text", "json"] },
  { key: "diff", contributionId: "terry.devtools.diff", component: DiffTool, tags: ["text", "diff"] },
  { key: "case", contributionId: "terry.devtools.case", component: CaseTool, tags: ["text", "converter"] },
  { key: "lines", contributionId: "terry.devtools.lines", component: LinesTool, tags: ["text"] },
  { key: "counter", contributionId: "terry.devtools.counter", component: CounterTool, tags: ["text", "counter"] },
  { key: "invisible", contributionId: "terry.devtools.invisible", component: InvisTool, tags: ["text", "debug"] },
  { key: "mojibake", contributionId: "terry.devtools.mojibake", component: MojibakeTool, tags: ["codec", "chinese", "text"] },
  { key: "time", contributionId: "terry.devtools.time", component: TimeTool, tags: ["converter", "time", "date"] },
  { key: "datecalc", contributionId: "terry.devtools.datecalc", component: DateCalcTool, tags: ["time", "date"] },
  { key: "filesize", contributionId: "terry.devtools.filesize", component: FileSizeTool, tags: ["converter", "filesize", "unit"] },
  { key: "numbase", contributionId: "terry.devtools.numbase", component: NumBaseTool, tags: ["converter", "number"] },
  { key: "color", contributionId: "terry.devtools.color", component: ColorTool, tags: ["color", "converter"] },
  { key: "chmod", contributionId: "terry.devtools.chmod", component: ChmodTool, tags: ["unix", "security"] },
  { key: "rmb", contributionId: "terry.devtools.rmb", component: RmbTool, tags: ["converter", "chinese", "number"] },
];

export const HOME_ID = "terry.devtools.home";

// Resolve a tool by its registry key or its manifest contribution id.
export function resolveTool(ref) {
  if (!ref) return null;
  return TOOLS.find((tool) => tool.key === ref || tool.contributionId === ref) || null;
}

export { Home };
