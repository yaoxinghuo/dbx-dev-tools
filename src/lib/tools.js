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

// contributionId -> tool component. `key` indexes i18n strings (t().tools[key]).
// `tags` holds language-independent canonical keys; display names live in
// t().tags so filtering stays stable when the UI language changes.
export const TOOLS = [
  { key: "password", contributionId: "terry.devtools.password", component: PasswordTool, tags: ["security", "generator", "random", "password"] },
  { key: "qrcode", contributionId: "terry.devtools.qrcode", component: QrTool, tags: ["generator", "image", "qrcode"] },
  { key: "barcode", contributionId: "terry.devtools.barcode", component: BarcodeTool, tags: ["generator", "barcode"] },
  { key: "hash", contributionId: "terry.devtools.hash", component: HashTool, tags: ["hash", "security", "digest"] },
  { key: "uuid", contributionId: "terry.devtools.uuid", component: UuidTool, tags: ["generator", "random", "identifier"] },
  { key: "base64", contributionId: "terry.devtools.base64", component: Base64Tool, tags: ["codec", "converter", "base64"] },
  { key: "jwt", contributionId: "terry.devtools.jwt", component: JwtTool, tags: ["security", "parser", "token"] },
  { key: "rmb", contributionId: "terry.devtools.rmb", component: RmbTool, tags: ["converter", "chinese", "number"] },
  { key: "url", contributionId: "terry.devtools.url", component: UrlTool, tags: ["codec", "converter", "url"] },
  { key: "imgb64", contributionId: "terry.devtools.imgb64", component: ImageBase64Tool, tags: ["converter", "image", "base64"] },
  { key: "time", contributionId: "terry.devtools.time", component: TimeTool, tags: ["converter", "time", "date"] },
  { key: "filesize", contributionId: "terry.devtools.filesize", component: FileSizeTool, tags: ["converter", "filesize", "unit"] },
  { key: "counter", contributionId: "terry.devtools.counter", component: CounterTool, tags: ["text", "counter"] },
  { key: "escape", contributionId: "terry.devtools.escape", component: EscapeTool, tags: ["converter", "text", "escape", "xml"] },
];

export const HOME_ID = "terry.devtools.home";

// Resolve a tool by its registry key or its manifest contribution id.
export function resolveTool(ref) {
  if (!ref) return null;
  return TOOLS.find((tool) => tool.key === ref || tool.contributionId === ref) || null;
}

export { Home };
