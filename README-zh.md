# Dev Tools — DBX 插件

[English](./README.md) | [中文](./README-zh.md)

日常开发工具集合的 [DBX](https://github.com/t8y2/dbx) 插件——**沙箱离线运行，零权限申请**。40 个工具、安装包约 100KB；纯前端实现、universal 包、无原生 Sidecar。

![DBX >=0.6.12](https://img.shields.io/badge/DBX-%3E%3D0.6.12-blue) ![Platform universal](https://img.shields.io/badge/platform-universal-green) ![40 个工具](https://img.shields.io/badge/工具-40-orange) ![安装包 约100KB](https://img.shields.io/badge/安装包-约100KB-brightgreen) ![权限 0](https://img.shields.io/badge/权限-0-blueviolet)

<img width="2232" height="1516" alt="image" src="https://github.com/user-attachments/assets/c260afbf-559d-4f82-8262-0132cda81db2" />

## 工具列表

- **密码生成器**：`crypto.getRandomValues` + 拒绝采样（无取模偏差），支持长度/字符集/易混淆字符规则、批量生成、熵强度估算
- **二维码生成器**：基于 `qrcode-generator`，容错级别/模块大小/静区可调，支持中心 Logo（自动建议 H 级容错），导出 SVG / PNG
- **条码生成器**：手写 CODE-128（自动 A/B/C 字符集切换）、CODE-39、EAN-13/8、UPC-A、ITF/ITF-14、Codabar 编码器；自动补/校验校验位，条宽/高度/文字可调，导出 SVG / PNG
- **Hash 生成器**：文本**与文件**的 MD5 + SHA-1/256/384/512 + CRC32 摘要（Web Crypto）；填写密钥后切换为 HMAC-SHA 摘要
- **ID 生成器**：UUID v4、NanoID、ULID 批量生成；UUID 支持大写/连字符选项
- **Base64 / Base32 / Base58 / Hex**：UTF-8 安全的多字母表编解码，支持 URL-safe 变体
- **JWT 解析 / 生成**：解码 header/payload、声明表格（exp/nbf 时效状态）、HS256/384/512 签名校验，并支持签名生成（payload JSON + 密钥 → token）
- **人民币大写**：数字金额转中文大写（零规则折叠、负值、兆级上限）
- **URL 编解码**：encodeURIComponent/encodeURI 两档、表单 `+` 空格切换、URL 查询参数拆解
- **图片 ⇄ Base64**：图片转 Base64（拖拽/粘贴/选文件，可选 data URI 前缀，显示体积膨胀率）；Base64 转图片（魔数嗅探 PNG/JPEG/GIF/WebP/BMP/ICO/SVG，预览 + 导出）
- **时间戳 ⇄ 日期**：秒/毫秒/微秒/纳秒自动识别（小数按秒处理），日期字符串双向解析；展示 Unix 秒/毫秒、本地与 UTC、ISO 8601、星期、年内第几天、ISO 周、闰年、时区偏移、相对时间；时长 ⇄ 毫秒换算
- **文件大小转换**：裸字节数或 `"1.5 GB"`/`"2 GiB"`/`"10M"` 形式输入解析为字节；最佳单位 + SI（1000 进制）与 IEC（1024 进制）双表
- **字数统计**：词数（拉丁词元 + 逐中文字）、字符（含/不含空白）、字母、数字、标点、空白、行数、段落、句子、UTF-8 字节大小、预计阅读时长
- **转义 / 反转义**：HTML/XML 实体、JavaScript 字符串转义、正则元字符、CSV 字段引用、POSIX shell 单引号
- **占位文本生成**：按精确长度生成测试文本（输入边界测试用），支持字符数或 UTF-8 字节数，Lorem ipsum / 循环模式 / 随机字母数字 / 随机中文，含常用长度预设
- **JSON 格式化**：校验并精确定位错误行列与上下文（自写解析器，因 JSC 报错不带位置），2/4/Tab 美化或压缩，键名排序，深度/键数/元素数统计，可导出 .json
- **URL 解析**：URL 工具同时把可解析的 URL 拆成协议/凭据/主机/端口/源/路径/查询/片段，各字段单独复制
- **文本对比**：基于 LCS 的两段文本差异对比，行级/字符级粒度，+/- 统计，可复制的统一补丁格式
- **大小写转换**：camelCase / PascalCase / snake_case / kebab-case / CONSTANT_CASE / Title Case / dot.case 等一次全出
- **进制转换**：BigInt 驱动的二/八/十/十六进制互转（`0x`/`0o`/`0b` 自动识别），附 ASCII 解释
- **乱码修复**：修复错误编码导致的乱码（UTF-8 被误判为 Windows-1252/GBK/Big5/Shift_JIS），候选结果按置信度排序
- **不可见字符**：可视化零宽字符、BOM、NBSP、双向控制符等，附码点/数量汇总与一键清理
- **日期计算**：两日期之差（天/周/月/年、工作日、时分秒）与日期加减 N 天/周/月
- **颜色转换与对比度**：HEX/RGB/HSL/HSV/CMYK 互转，色板 + 取色器 + 屏幕取色，白底/黑底/自定义背景的 WCAG 对比度（AA/AAA 徽章）
- **文本行处理**：修剪、去空行、去重、A→Z/Z→A 排序、加行号、倒序——按固定流水线组合生效
- **AES 加解密**：PBKDF2（10 万次，SHA-256）→ AES-256-GCM；输出 `base64(salt|iv|密文)`，GCM 标签可拒绝错误密码
- **chmod 计算器**：所有者/用户组/其他 rwx 勾选 ⇄ 八进制，实时符号表示（`rwxr-xr-x`），常用预设
- **正则测试器**：表达式 + 标志位，匹配高亮预览、捕获组表格、替换预览
- **Semver 版本比较**：按 semver.org 规则比较两个版本号、排序版本列表（含预发布号）
- **图片压缩转换**：重编码为 WebP/JPEG/PNG，质量滑杆可调，前后体积对比
- **RSA 密钥生成器**：RSA 密钥对（RSASSA / RSA-PSS / RSA-OAEP，2048–4096 位）导出 PEM/PKCS#8
- **证书解析器**：解析 X.509 PEM/DER 证书：主体/签发者、有效期、SAN、密钥用途、SHA-1/256 指纹
- **IP 计算器**：IPv4 子网计算（网络/广播/可用主机/掩码/反掩码/范围属性/PTR）与子网划分；IPv6 压缩/展开、前缀、类型识别、ip6.arpa 反解
- **Cron 表达式**：标准五段式 Cron 的人话描述，预览接下来的执行时间
- **Punycode / IDN**：国际化域名 ⇄ `xn--` ASCII 形式互转
- **Quoted-Printable**：RFC 2045 邮件正文编码的编解码
- **Data URI 生成**：文本或文件 → `data:` URI 内联嵌入
- **SQL IN 拼接**：按行列表 → 带引号的 `IN (...)` 值
- **Unicode 检查**：逐码位分析十六进制、UTF-8/UTF-16 字节、所属区块
- **TOTP 生成器**：用 base32 密钥或 `otpauth://` URI 生成 RFC 6238 动态口令
- **占位图生成**：任意尺寸的 PNG/JPEG/WebP 占位图

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
