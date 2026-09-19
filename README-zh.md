# Dev Tools

[English](./README.md) | [中文](./README-zh.md)

日常开发工具集合的 [DBX](https://github.com/t8y2/dbx) 插件——纯前端实现、universal 包、无原生 Sidecar。

![DBX >=0.6.12](https://img.shields.io/badge/DBX-%3E%3D0.6.12-blue) ![Platform universal](https://img.shields.io/badge/platform-universal-green)

<img width="2236" height="1220" alt="image" src="https://github.com/user-attachments/assets/839f7421-3744-4274-af3b-e5c0bc9d1972" />

## 工具列表

- **密码生成器**：`crypto.getRandomValues` + 拒绝采样（无取模偏差），支持长度/字符集/易混淆字符规则、批量生成、熵强度估算
- **二维码生成器**：基于 `qrcode-generator`，容错级别/模块大小/静区可调，导出 SVG / PNG
- **条码生成器**：手写 CODE-128 B 编码器，条宽/高度/文字可调，导出 SVG / PNG
- **Hash 生成器**：MD5 + SHA-1/256/384/512（Web Crypto）
- **UUID 生成器**：v4 批量生成，大写/连字符选项
- **Base64 编解码**：UTF-8 安全，支持 URL-safe 变体
- **JWT 解析**：解码 header/payload、声明表格（exp/nbf 时效状态），支持 HS256/384/512 密钥签名校验（Web Crypto）
- **人民币大写**：数字金额转中文大写（零规则折叠、负值、兆级上限）
- **URL 编解码**：encodeURIComponent/encodeURI 两档、表单 `+` 空格切换、URL 查询参数拆解
- **图片 ⇄ Base64**：图片转 Base64（拖拽/粘贴/选文件，可选 data URI 前缀，显示体积膨胀率）；Base64 转图片（魔数嗅探 PNG/JPEG/GIF/WebP/BMP/ICO/SVG，预览 + 导出）
- **时间戳 ⇄ 日期**：秒/毫秒/微秒/纳秒自动识别（小数按秒处理），日期字符串双向解析；展示 Unix 秒/毫秒、本地与 UTC、ISO 8601、星期、年内第几天、ISO 周、闰年、时区偏移、相对时间
- **文件大小转换**：裸字节数或 `"1.5 GB"`/`"2 GiB"`/`"10M"` 形式输入解析为字节；最佳单位 + SI（1000 进制）与 IEC（1024 进制）双表
- **字数统计**：词数（拉丁词元 + 逐中文字）、字符（含/不含空白）、字母、数字、标点、空白、行数、段落、句子、UTF-8 字节大小、预计阅读时长
- **转义 / 反转义**：HTML 实体、JavaScript 字符串转义、正则元字符、CSV 字段引用、POSIX shell 单引号

首页提供多语言搜索（查询匹配所有语言的名称/描述/标签，不限于当前界面语言）和按当前语言本地化的标签筛选。

## 安装

### 插件商店安装（推荐）

**插件中心 → 插件商店**，搜索 **Dev Tools** 点击安装。商店包经官方签名，无需额外设置。

### 本地包安装

1. 从 [Releases](https://github.com/yaoxinghuo/dbx-dev-tools/releases) 下载最新的 `terry.devtools-*-universal.dbxp`。
2. 在 DBX 中打开 **插件中心 → 设置 → 允许安装未签名开发包**。
3. 选择本地 `.dbxp` 安装。

## 使用

**插件中心 → 已安装 → Dev Tools**，每个工具以独立工作台标签页打开。插件标签页跨重启恢复，打开一次后保留该标签即可，不用每次进插件中心；标签内左侧导航可切换所有工具。

## 架构

每个工具是一个 manifest `workbench` contribution（独立入口/标签页），共享同一个 Svelte + Vite 构建的 `ui/`。路由规则：

1. `context.tool` —— 插件内部导航显式指定的工具 key
2. `contributionId` —— 生产宿主 init 消息携带的 workbench ID（dev host 不提供，此时显示首页）
3. 兜底 —— Home 工具列表页

复制走 `dbxPlugin.copy()`（宿主剪贴板桥），导出走 `dbxPlugin.saveFile()`（宿主原生保存对话框），两者在 dev host 下自动降级为浏览器实现。

## 参与贡献

有你常用的小工具想加进来？这个集合就是为持续扩充设计的——欢迎开 issue 提想法，或者按下面四步直接提 PR。

## 添加新工具

1. `src/tools/` 下新建 `XxxTool.svelte`（用 `ToolShell` 包裹内容，复用 `dbx-*` 样式类与 `CopyButton`）
2. `src/lib/tools.js` 的 `TOOLS` 数组注册 `{ key, contributionId, component, tags }`（tags 为语言无关的 canonical key，并在 `t().tags` 补中英文显示名）
3. `manifest.json` 增加对应 `workbench` contribution（id 形如 `terry.devtools.xxx`）及 `zh-CN` 本地化
4. `src/lib/i18n.js` 补充 `tools.xxx` 的中英文案

## 开发

```bash
npm install
npm run build
dbx-plugin dev --path . --port 5190
```

浏览器打开 `http://127.0.0.1:5190/`。`npm run build:watch` 配合 dev host 的自动重载。

打包未签名候选包：`dbx-plugin package .` → `dist/*.dbxp`。

## 发布

在本仓库打 tag + GitHub Release，`.github/workflows/plugin-release.yml` 自动构建候选包。然后向 [`t8y2/dbx-store`](https://github.com/t8y2/dbx-store) 提候选 PR 等待审核签名，详见[插件开发文档](https://github.com/t8y2/dbx/blob/main/docs/content/docs/plugin-development.cn.mdx)。
