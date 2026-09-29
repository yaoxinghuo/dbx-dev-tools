<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { saveFile } from "../lib/bridge.js";
  import { formatSize, IEC_UNITS } from "../lib/filesize.js";
  import { t, onLangChange } from "../lib/i18n.js";
  import { persistState } from "../lib/persist.svelte.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.datauri);
  const d = $derived(s.datauri);

  let mode = $state("text"); // text | file | parse
  let text = $state("hello world");
  let mime = $state("text/plain");
  let fileInfo = $state(null); // { name, size, type, dataUri }
  let output = $state("");
  let error = $state("");

  let parseIn = $state("");
  // { mime, charset, isB64, bytes } | null — invalid input gives "bad"
  const parsed = $derived.by(() => {
    const uri = parseIn.trim();
    if (!uri) return null;
    const m = /^data:([^,]*),(.*)$/is.exec(uri);
    if (!m) return "bad";
    const head = m[1].split(";");
    const mimeType = head[0] || "text/plain";
    const isB64 = head.some((p) => p.toLowerCase() === "base64");
    const charset = head.find((p) => p.toLowerCase().startsWith("charset="))?.slice(8) || "";
    try {
      let bytes;
      if (isB64) {
        bytes = Uint8Array.from(atob(m[2].replace(/\s/g, "")), (c) => c.charCodeAt(0));
      } else {
        // percent-encode each byte then turn %XX into raw bytes
        const bin = m[2].replace(/%([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
        bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      }
      return { mime: mimeType, charset, isB64, bytes };
    } catch {
      return "bad";
    }
  });

  const parseText = $derived.by(() => {
    if (!parsed || parsed === "bad") return "";
    const textual = /^(text\/|image\/svg|application\/(json|xml|javascript)|[^/]+\+(json|xml))/.test(parsed.mime);
    if (!textual) return "";
    try { return new TextDecoder(parsed.charset || "utf-8").decode(parsed.bytes); } catch { return ""; }
  });
  const parseIsImage = $derived(parsed && parsed !== "bad" && parsed.mime.startsWith("image/"));

  async function downloadParsed() {
    if (!parsed || parsed === "bad") return;
    const ext = parsed.mime.split("/")[1]?.split("+")[0] || "bin";
    await saveFile({ fileName: `data.${ext}`, contentType: parsed.mime }, parsed.bytes);
  }

  const textUri = $derived.by(() => {
    if (!text) return "";
    try {
      return `data:${mime || "text/plain"};charset=utf-8,${encodeURIComponent(text)}`;
    } catch {
      return "";
    }
  });

  async function pick(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    error = "";
    try {
      const buffer = new Uint8Array(await f.arrayBuffer());
      let binary = "";
      for (let i = 0; i < buffer.length; i += 8192) {
        binary += String.fromCharCode(...buffer.subarray(i, i + 8192));
      }
      fileInfo = { name: f.name, size: f.size, type: f.type || "application/octet-stream" };
      output = `data:${fileInfo.type};base64,${btoa(binary)}`;
    } catch {
      error = d.readFail;
      output = "";
    }
  }

  $effect(() => {
    if (mode === "text") output = textUri;
  });
  persistState("datauri", {
    get: () => ({ mode, text, mime }),
    set: (v) => {
      if (v.mode !== "parse") mode = v.mode ?? mode;
      text = v.text ?? text;
      mime = v.mime ?? mime;
    },
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card controls">
    <div class="seg">
      <button type="button" class="seg-btn" class:active={mode === "text"} onclick={() => (mode = "text")}>{d.textMode}</button>
      <button type="button" class="seg-btn" class:active={mode === "file"} onclick={() => (mode = "file")}>{d.fileMode}</button>
      <button type="button" class="seg-btn" class:active={mode === "parse"} onclick={() => (mode = "parse")}>{d.parseMode}</button>
    </div>
    {#if mode === "text"}
      <label class="dbx-label" for="du-mime">{d.mime}</label>
      <input id="du-mime" class="dbx-input mono" bind:value={mime} placeholder="text/plain" spellcheck="false" />
      <label class="dbx-label" for="du-text">{s.input}</label>
      <textarea id="du-text" class="dbx-textarea" rows="4" bind:value={text}></textarea>
    {:else if mode === "file"}
      <input type="file" class="dbx-input" onchange={pick} />
      {#if fileInfo}
        <p class="meta">{fileInfo.name} · {fileInfo.type} · {formatSize(fileInfo.size, IEC_UNITS)}</p>
      {/if}
    {:else}
      <textarea class="dbx-textarea mono" rows="4" bind:value={parseIn} placeholder="data:image/png;base64,…" spellcheck="false"></textarea>
      {#if parsed === "bad"}<p class="err">{d.badUri}</p>{/if}
      {#if parsed && parsed !== "bad"}
        <table class="dbx-table">
          <tbody>
            <tr><td class="k">MIME</td><td><code>{parsed.mime}</code></td></tr>
            {#if parsed.charset}<tr><td class="k">charset</td><td><code>{parsed.charset}</code></td></tr>{/if}
            <tr><td class="k">{d.enc}</td><td><code>{parsed.isB64 ? "base64" : "percent"}</code></td></tr>
            <tr><td class="k">{d.decodedSize}</td><td><code>{formatSize(parsed.bytes.length, IEC_UNITS)}</code></td></tr>
          </tbody>
        </table>
        {#if parseIsImage}
          <img src={parseIn.trim()} alt="" class="preview" />
        {:else if parseText}
          <textarea class="dbx-textarea mono" rows="4" readonly value={parseText}></textarea>
        {/if}
        <div class="out-head">
          <CopyButton text={parseText || parsed.mime} small />
          <button type="button" class="dbx-btn" onclick={downloadParsed}>{s.download}</button>
        </div>
      {/if}
    {/if}
    {#if error}<p class="err">{error}</p>{/if}
    {#if output && mode !== "parse"}
      <div class="out-head">
        <label class="dbx-label" for="du-out">{s.output}</label>
        <CopyButton text={output} small />
      </div>
      <textarea id="du-out" class="dbx-textarea mono" rows="4" readonly value={output}></textarea>
    {/if}
  </div>
</ToolShell>

<style>
  .controls { display: flex; flex-direction: column; gap: 12px; }
  .out-head { display: flex; align-items: center; justify-content: space-between; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .meta { margin: 0; font-size: 13px; color: var(--color-text-secondary, #64748b); }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; margin: 0; }
  .seg { display: flex; gap: 0; border: 1px solid var(--color-border, #e2e8f0); border-radius: 8px; overflow: hidden; width: fit-content; }
  .seg-btn { padding: 6px 16px; font-size: 13px; background: transparent; border: none; color: var(--color-text-secondary, #64748b); cursor: pointer; }
  .seg-btn.active { background: var(--color-primary, #3b82f6); color: #fff; }
  .k { white-space: nowrap; font-weight: 600; width: 90px; }
  .preview { max-width: 100%; max-height: 240px; object-fit: contain; align-self: flex-start; border: 1px solid var(--color-border, #e2e8f0); border-radius: 8px; background: #fff; }
  .dbx-table code { overflow-wrap: anywhere; }
</style>
