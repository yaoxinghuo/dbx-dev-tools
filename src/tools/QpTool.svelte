<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { t, onLangChange } from "../lib/i18n.js";
  import { persistState } from "../lib/persist.svelte.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.qp);
  const q = $derived(s.qp);

  let mode = $state("encode");
  // Encode and decode keep separate input buffers — flipping modes should
  // not overwrite what the user pasted into the other box.
  let encInput = $state("");
  let decInput = $state("");
  let output = $state("");
  let error = $state("");

  // Round-trip convenience: after switching modes, an empty target buffer
  // gets seeded with the output just produced.
  function swapSeed(m) {
    if (!output) return;
    if (m === "encode" && !encInput) encInput = output;
    else if (m === "decode" && !decInput) decInput = output;
  }

  // RFC 2045 quoted-printable. Encoding is UTF-8 aware and soft-breaks lines
  // at 75 chars; decoding reverses both =XX and soft line breaks.
  function qpEncode(text) {
    const bytes = new TextEncoder().encode(text);
    const lines = [];
    let line = "";
    for (const byte of bytes) {
      const printable = (byte >= 33 && byte <= 126 && byte !== 61) || byte === 32 || byte === 9;
      const chunk = printable ? String.fromCharCode(byte) : "=" + byte.toString(16).toUpperCase().padStart(2, "0");
      if (line.length + chunk.length > 74) {
        lines.push(line + "=");
        line = "";
      }
      line += chunk;
    }
    lines.push(line);
    return lines.join("\r\n");
  }

  function qpDecode(text) {
    const normalized = text.replace(/=\r?\n/g, "");
    const hex = normalized.replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    const bytes = Uint8Array.from(hex, (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  }

  $effect(() => {
    error = "";
    output = "";
    const text = mode === "encode" ? encInput : decInput;
    if (!text) return;
    try {
      output = mode === "encode" ? qpEncode(text) : qpDecode(text);
    } catch {
      error = q.invalid;
    }
  });
  persistState("qp", {
    get: () => ({ mode, encInput, decInput }),
    set: (v) => {
      mode = v.mode ?? mode;
      encInput = v.encInput ?? encInput;
      decInput = v.decInput ?? decInput;
    },
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card controls">
    <div class="modes">
      <label class="check"><input type="radio" bind:group={mode} value="encode" onchange={() => swapSeed("encode")} /> {q.encode}</label>
      <label class="check"><input type="radio" bind:group={mode} value="decode" onchange={() => swapSeed("decode")} /> {q.decode}</label>
    </div>
    <label class="dbx-label" for="qp-in">{s.input}</label>
    {#if mode === "encode"}
      <textarea id="qp-in" class="dbx-textarea mono" rows="5" bind:value={encInput} spellcheck="false" placeholder={q.encodePlaceholder}></textarea>
    {:else}
      <textarea id="qp-in" class="dbx-textarea mono" rows="5" bind:value={decInput} spellcheck="false" placeholder={q.decodePlaceholder}></textarea>
    {/if}
    {#if error}<p class="err">{error}</p>{/if}
    <div class="out-head">
      <label class="dbx-label" for="qp-out">{s.output}</label>
      <CopyButton text={output} small />
    </div>
    <textarea id="qp-out" class="dbx-textarea mono" rows="5" readonly value={output}></textarea>
  </div>
</ToolShell>

<style>
  .controls { display: flex; flex-direction: column; gap: 12px; }
  .modes { display: flex; gap: 18px; align-items: center; }
  .check { display: flex; align-items: center; gap: 8px; font-size: 13px; }
  .out-head { display: flex; align-items: center; justify-content: space-between; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; margin: 0; }
</style>
