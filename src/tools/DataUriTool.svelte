<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { formatSize, IEC_UNITS } from "../lib/filesize.js";
  import { t, onLangChange } from "../lib/i18n.js";
  import { persistState } from "../lib/persist.svelte.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.datauri);
  const d = $derived(s.datauri);

  let mode = $state("text"); // text | file
  let text = $state("hello world");
  let mime = $state("text/plain");
  let fileInfo = $state(null); // { name, size, type, dataUri }
  let output = $state("");
  let error = $state("");

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
      mode = v.mode ?? mode;
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
    </div>
    {#if mode === "text"}
      <label class="dbx-label" for="du-mime">{d.mime}</label>
      <input id="du-mime" class="dbx-input mono" bind:value={mime} placeholder="text/plain" spellcheck="false" />
      <label class="dbx-label" for="du-text">{s.input}</label>
      <textarea id="du-text" class="dbx-textarea" rows="4" bind:value={text}></textarea>
    {:else}
      <input type="file" class="dbx-input" onchange={pick} />
      {#if fileInfo}
        <p class="meta">{fileInfo.name} · {fileInfo.type} · {formatSize(fileInfo.size, IEC_UNITS)}</p>
      {/if}
    {/if}
    {#if error}<p class="err">{error}</p>{/if}
    {#if output}
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
</style>
