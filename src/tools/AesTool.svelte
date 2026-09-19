<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { aesEncrypt, aesDecrypt } from "../lib/aescrypt.js";
  import { t, onLangChange } from "../lib/i18n.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.aes);
  const a = $derived(s.aes);

  let mode = $state("enc"); // "enc" | "dec"
  let input = $state("");
  let password = $state("");
  let output = $state("");
  let error = $state("");
  let busy = $state(false);

  async function run() {
    error = "";
    output = "";
    if (!input || !password) return;
    busy = true;
    try {
      output = mode === "enc" ? await aesEncrypt(input, password) : await aesDecrypt(input, password);
    } catch {
      error = a.failed;
    } finally {
      busy = false;
    }
  }
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <div class="seg">
      <button type="button" class="seg-btn" class:active={mode === "enc"} onclick={() => (mode = "enc")}>{a.encrypt}</button>
      <button type="button" class="seg-btn" class:active={mode === "dec"} onclick={() => (mode = "dec")}>{a.decrypt}</button>
    </div>
    <label class="dbx-label" for="aes-in">{mode === "enc" ? a.plain : a.cipher}</label>
    <textarea id="aes-in" class="dbx-textarea mono" rows="5" bind:value={input}
      placeholder={mode === "enc" ? a.plainHint : a.cipherHint}></textarea>
    <input class="dbx-input" type="password" bind:value={password} placeholder={a.password} />
    <div class="actions">
      <button type="button" class="dbx-btn dbx-btn--primary" onclick={run} disabled={busy || !input || !password}>
        {mode === "enc" ? a.encrypt : a.decrypt}
      </button>
    </div>
    {#if error}<p class="err">{error}</p>{/if}
    {#if output}
      <div class="card-head">
        <h2 class="dbx-section-title">{s.output}</h2>
        <CopyButton text={output} small />
      </div>
      <textarea class="dbx-textarea mono" rows="4" value={output} readonly></textarea>
    {/if}
  </div>
</ToolShell>

<style>
  .dbx-card { display: flex; flex-direction: column; gap: 12px; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .seg { display: flex; border: 1px solid var(--color-border, #e2e8f0); border-radius: 8px; overflow: hidden; width: fit-content; }
  .seg-btn { padding: 6px 16px; font-size: 13px; background: transparent; border: none; color: var(--color-text-secondary, #64748b); cursor: pointer; }
  .seg-btn.active { background: var(--color-primary, #3b82f6); color: #fff; }
  .actions { display: flex; }
  .card-head { display: flex; align-items: center; justify-content: space-between; }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; margin: 0; }
</style>
