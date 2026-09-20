# Dev Tools

[English](./README.md) | [中文](./README-zh.md)

A collection of everyday developer utilities as a [DBX](https://github.com/t8y2/dbx) plugin — **sandboxed, offline, zero permissions**. 31 tools in a package under 100KB; pure frontend, universal package, no native sidecar.

![DBX >=0.6.12](https://img.shields.io/badge/DBX-%3E%3D0.6.12-blue) ![Platform universal](https://img.shields.io/badge/platform-universal-green) ![31 tools](https://img.shields.io/badge/tools-31-orange) ![package <100KB](https://img.shields.io/badge/package-%3C100KB-brightgreen) ![permissions none](https://img.shields.io/badge/permissions-none-blueviolet)

<img width="2236" height="1522" alt="image" src="https://github.com/user-attachments/assets/0047105c-e365-4018-b697-97608b20700c" />

## Tools

- **Password Generator** — `crypto.getRandomValues` + rejection sampling (no modulo bias), charset rules, batch generation, entropy meter
- **QR Code Generator** — `qrcode-generator`, adjustable EC level / module size / quiet zone, optional center logo (auto-suggests EC H), SVG & PNG export
- **Barcode Generator** — hand-rolled encoders for CODE-128 (auto A/B/C set switching), CODE-39, EAN-13/8, UPC-A, ITF/ITF-14, Codabar; auto check digits, adjustable bar width / height / caption, SVG & PNG export
- **Hash Generator** — MD5 + SHA-1/256/384/512 digests for text **and files**; optional key switches to HMAC-SHA digests
- **ID Generator** — UUID v4, NanoID and ULID in bulk; uppercase / hyphen options for UUID
- **Base64** — UTF-8 safe encode/decode, URL-safe variant
- **JWT Parser / Generator** — decodes header/payload, claims table with exp/nbf validity badges, HS256/384/512 signature verification, plus JWT signing (payload JSON + secret → token)
- **RMB Uppercase** — numeric amount to Chinese RMB uppercase (correct 零 folding, negatives, up to 兆)
- **URL Encoder / Decoder** — `encodeURIComponent`/`encodeURI` modes, form `+` toggle, query parameter breakdown
- **Image ⇄ Base64** — image to Base64 (drop / paste / pick, optional data-URI prefix, size inflation shown); Base64 to image with magic-byte sniffing, preview & export
- **Timestamp ⇄ Date** — Unix timestamps auto-detected across s/ms/µs/ns (decimals treated as seconds), date strings parsed both ways; shows Unix s/ms, local & UTC, ISO 8601, day of week, day of year, ISO week, leap year, timezone offset, relative time
- **File Size Converter** — bare bytes or `"1.5 GB"`/`"2 GiB"`/`"10M"` style input parsed to bytes; best-fit unit plus full SI (1000) and IEC (1024) tables
- **Word Counter** — words (Latin tokens + per-CJK-char), characters (with/without spaces), letters, digits, punctuation, whitespace, lines, paragraphs, sentences, UTF-8 byte size, reading time
- **Escape / Unescape** — HTML/XML entities, JavaScript string escapes, regex metacharacters, CSV field quoting, POSIX shell single-quoting
- **Lorem Ipsum** — dummy text at an exact length for input-boundary testing: characters or UTF-8 bytes, lorem / repeating pattern / random alphanumeric / random Chinese modes, common length presets
- **JSON Formatter** — validate with precise error line/column/snippet (own parser, since JSC reports no position), pretty-print at 2/4/tab or minify, key sorting, depth/key/item stats, .json export
- **URL breakdown** — the URL tool also splits a parseable URL into protocol / credentials / host / port / origin / path / query / fragment, each field individually copyable
- **Text Diff** — LCS-based diff between two texts, line or character granularity, +/- stats, unified patch copy
- **Case Converter** — camelCase / PascalCase / snake_case / kebab-case / CONSTANT_CASE / Title Case / dot.case and more, all at once
- **Number Base** — BigInt-powered binary/octal/decimal/hex conversion (`0x`/`0o`/`0b` auto-detected), ASCII interpretation of the value
- **Mojibake Fixer** — repairs text garbled by the wrong charset (UTF-8 mistaken as Windows-1252/GBK/Big5/Shift_JIS), ranked candidates
- **Invisible Characters** — visualizes zero-width chars, BOM, NBSP, bidi controls and friends, with a code-point/count summary and one-click cleanup
- **Date Calculator** — difference between two dates (days/weeks/months/years, working days, h/m/s) and date ± N days/weeks/months
- **Color Converter & Contrast** — HEX/RGB/HSL/HSV conversion with swatch + color picker, WCAG contrast ratio vs white, black or a custom background (AA/AAA badges)
- **Line Operations** — trim, remove empty, dedupe, sort A→Z/Z→A, add line numbers, reverse — combined in a fixed pipeline
- **AES Encrypt / Decrypt** — PBKDF2 (100k, SHA-256) → AES-256-GCM; output is `base64(salt|iv|ciphertext)`, GCM tag rejects wrong passwords
- **Chmod Calculator** — owner/group/other rwx checkboxes ⇄ octal, live symbolic (`rwxr-xr-x`), common presets
- **Regex Tester** — pattern + flags, highlighted match preview, capture-group table, replace preview
- **Semver Compare** — compare two versions and sort version lists per semver.org rules (prerelease-aware)
- **Image Compressor** — re-encode to WebP/JPEG/PNG with quality slider, before/after size preview
- **RSA Key Generator** — RSA key pairs (RSASSA / RSA-PSS / RSA-OAEP, 2048–4096 bits) exported as PEM/PKCS#8
- **Certificate Decoder** — parse X.509 PEM/DER: subject/issuer, validity, SAN, key usage, SHA-1/256 fingerprints

The home page offers multilingual search (queries match names/descriptions/tags in **all** languages, not just the active one) and tag filtering localized to the current UI language.

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
2. Register `{ key, contributionId, component, tags }` in `src/lib/tools.js` (tags are canonical keys; add their en+zh display names to `t().tags`)
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
