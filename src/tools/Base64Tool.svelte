<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { base32Encode, base32Decode, base58Encode, base58Decode, hexEncode, hexDecode } from "../lib/codec.js";
  import { t, onLangChange } from "../lib/i18n.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.base64);
  const b = $derived(s.base64);

  let mode = $state("encode");
  let codec = $state("base64");
  let urlSafe = $state(false);
  let input = $state("");
  let output = $state("");
  let error = $state("");

  $effect(() => {
    error = "";
    output = "";
    if (!input) return;
    try {
      output = mode === "encode" ? encode(input) : decode(input);
    } catch {
      error = b.invalid;
    }
  });

  function encode(text) {
    if (codec === "base64") return encodeB64(text, urlSafe);
    if (codec === "base32") return base32Encode(text);
    if (codec === "base58") return base58Encode(text);
    return hexEncode(text);
  }

  function decode(text) {
    if (codec === "base64") return decodeB64(text, urlSafe);
    if (codec === "base32") return base32Decode(text);
    if (codec === "base58") return base58Decode(text.trim());
    return hexDecode(text);
  }

  function encodeB64(text, url) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    let b64 = btoa(binary);
    if (url) b64 = b64.replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
    return b64;
  }

  function decodeB64(text, url) {
    let normalized = text.trim();
    if (url) normalized = normalized.replaceAll("-", "+").replaceAll("_", "/");
    const remainder = normalized.length % 4;
    if (remainder) normalized += "=".repeat(4 - remainder);
    const bytes = Uint8Array.from(atob(normalized), (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card controls">
    <div class="modes">
      <label class="check"><input type="radio" bind:group={mode} value="encode" /> {b.encode}</label>
      <label class="check"><input type="radio" bind:group={mode} value="decode" /> {b.decode}</label>
      <label class="check"><input type="checkbox" bind:checked={urlSafe} disabled={codec !== "base64"} /> {b.urlSafe}</label>
    </div>
    <div class="modes">
      {#each ["base64", "base32", "base58", "hex"] as c}
        <label class="check"><input type="radio" bind:group={codec} value={c} /> {b["codec_" + c]}</label>
      {/each}
    </div>
    <label class="dbx-label" for="b64-in">{s.input}</label>
    <textarea id="b64-in" class="dbx-textarea" rows="5" bind:value={input}
      placeholder={mode === "encode" ? b.encodePlaceholder : b.decodePlaceholder}></textarea>
    <div class="out-head">
      <label class="dbx-label" for="b64-out">{s.output}</label>
      <CopyButton text={output} small />
    </div>
    {#if error}
      <p class="err">{error}</p>
    {/if}
    <textarea id="b64-out" class="dbx-textarea" rows="5" readonly value={output}></textarea>
  </div>
</ToolShell>

<style>
  .controls { display: flex; flex-direction: column; gap: 12px; }
  .modes { display: flex; gap: 18px; align-items: center; flex-wrap: wrap; }
  .check { display: flex; align-items: center; gap: 8px; font-size: 13px; }
  .out-head { display: flex; align-items: center; justify-content: space-between; }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; margin: 0; }
  textarea[readonly] { background: var(--color-muted, #f4f4f5); }
</style>
