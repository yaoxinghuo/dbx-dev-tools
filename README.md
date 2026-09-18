# Dev Tools

[English](./README.md) | [中文](./README-zh.md)

A collection of everyday developer utilities as a [DBX](https://github.com/t8y2/dbx) plugin — pure frontend, universal package, no native sidecar.

![DBX >=0.6.12](https://img.shields.io/badge/DBX-%3E%3D0.6.12-blue) ![Platform universal](https://img.shields.io/badge/platform-universal-green)

## Tools

- **Password Generator** — `crypto.getRandomValues` + rejection sampling (no modulo bias), charset rules, batch generation, entropy meter
- **QR Code Generator** — `qrcode-generator`, adjustable EC level / module size / quiet zone, SVG & PNG export
- **Barcode Generator** — hand-rolled CODE-128 B encoder, adjustable bar width / height / caption, SVG & PNG export
- **Hash Generator** — MD5 + SHA-1/256/384/512 via Web Crypto
- **UUID Generator** — v4 in bulk, uppercase / hyphen options
- **Base64** — UTF-8 safe encode/decode, URL-safe variant
- **JWT Parser** — decodes header/payload, claims table with exp/nbf validity badges, HS256/384/512 signature verification
- **RMB Uppercase** — numeric amount to Chinese RMB uppercase (correct 零 folding, negatives, up to 兆)
- **URL Encoder / Decoder** — `encodeURIComponent`/`encodeURI` modes, form `+` toggle, query parameter breakdown
- **Image ⇄ Base64** — image to Base64 (drop / paste / pick, optional data-URI prefix, size inflation shown); Base64 to image with magic-byte sniffing, preview & export

## Install

### From the plugin store (recommended)

**Plugin Center → Store** — find **Dev Tools** and click install. Store packages are officially signed, no extra setup needed.

### From a release package

1. Download the latest `terry.devtools-*-universal.dbxp` from [Releases](https://github.com/yaoxinghuo/dbx-dev-tools/releases).
2. In DBX: **Plugin Center → Settings → allow unsigned development packages**.
3. Choose the local `.dbxp` to install.

## Usage

**Plugin Center → Installed → Dev Tools** — each tool opens as its own workbench tab. Plugin tabs are restored across restarts, so open once and keep the tab; no need to revisit the plugin center. Inside any tab, the left sidebar switches between tools.

## Architecture

Each tool is a manifest `workbench` contribution (independent entry/tab), all sharing one Svelte + Vite bundle under `ui/`. Route resolution:

1. `context.tool` — explicit tool key from in-plugin navigation
2. `contributionId` — workbench id from the host init message (production only; the dev host omits it and shows Home)
3. Fallback — Home tool grid

Copy goes through `dbxPlugin.copy()` (host clipboard bridge) and export through `dbxPlugin.saveFile()` (native save dialog); both degrade to browser implementations under the dev host.

## Contributing

Have a small tool you reach for every day? This collection is meant to grow — open an issue with your idea, or send a PR following the four steps below.

## Add a new tool

1. Create `src/tools/XxxTool.svelte` (wrap content in `ToolShell`, reuse `dbx-*` classes and `CopyButton`)
2. Register `{ key, contributionId, component }` in `src/lib/tools.js`
3. Add a `workbench` contribution (`terry.devtools.xxx`) and `zh-CN` localization in `manifest.json`
4. Add `tools.xxx` strings (en + zh) in `src/lib/i18n.js`

## Development

```bash
npm install
npm run build
dbx-plugin dev --path . --port 5190
```

Open `http://127.0.0.1:5190/`. `npm run build:watch` pairs with the dev host's auto reload.

Package an unsigned candidate: `dbx-plugin package .` → `dist/*.dbxp`.

## Publishing

Tag + GitHub Release in this repo — `.github/workflows/plugin-release.yml` builds the candidate automatically. Then open a candidate PR against [`t8y2/dbx-store`](https://github.com/t8y2/dbx-store) and wait for review/signing. See the [plugin development docs](https://github.com/t8y2/dbx/blob/main/docs/content/docs/plugin-development.cn.mdx).
