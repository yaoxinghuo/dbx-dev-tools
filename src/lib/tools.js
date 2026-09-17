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

// contributionId -> tool component. `key` indexes i18n strings (t().tools[key]).
export const TOOLS = [
  { key: "password", contributionId: "terry.devtools.password", component: PasswordTool },
  { key: "qrcode", contributionId: "terry.devtools.qrcode", component: QrTool },
  { key: "barcode", contributionId: "terry.devtools.barcode", component: BarcodeTool },
  { key: "hash", contributionId: "terry.devtools.hash", component: HashTool },
  { key: "uuid", contributionId: "terry.devtools.uuid", component: UuidTool },
  { key: "base64", contributionId: "terry.devtools.base64", component: Base64Tool },
  { key: "jwt", contributionId: "terry.devtools.jwt", component: JwtTool },
  { key: "rmb", contributionId: "terry.devtools.rmb", component: RmbTool },
  { key: "url", contributionId: "terry.devtools.url", component: UrlTool },
  { key: "imgb64", contributionId: "terry.devtools.imgb64", component: ImageBase64Tool },
];

export const HOME_ID = "terry.devtools.home";

// Resolve a tool by its registry key or its manifest contribution id.
export function resolveTool(ref) {
  if (!ref) return null;
  return TOOLS.find((tool) => tool.key === ref || tool.contributionId === ref) || null;
}

export { Home };
