<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { aesEncrypt, aesDecrypt, aesCryptRaw, parseKeyMaterial, randomKeyHex } from "../lib/aescrypt.js";
  import { t, onLangChange } from "../lib/i18n.js";
  import { persistState } from "../lib/persist.svelte.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.aes);
  const a = $derived(s.aes);

  let mode = $state("enc"); // "enc" | "dec"
  // Plaintext and ciphertext keep separate input buffers — flipping modes
  // should not overwrite what the user pasted into the other box.
  let encInput = $state("");
  let decInput = $state("");
  let password = $state("");
  let keyBits = $state(256);
  let iterations = $state(100000);
  let keySrc = $state("pwd"); // "pwd" | "raw"
  let rawKey = $state("");
  let cipherMode = $state("gcm"); // "gcm" | "cbc" — raw-key mode only
  let aad = $state("");
  let output = $state("");
  let error = $state("");
  let busy = $state(false);

  const input = $derived(mode === "enc" ? encInput : decInput);

  function setMode(m) {
    if (m === mode) return;
    mode = m;
    // Round-trip convenience: an empty target buffer gets seeded with the
    // output we just produced (ciphertext → decrypt box, and vice versa).
    if (!output) return;
    if (m === "enc" && !encInput) encInput = output;
    else if (m === "dec" && !decInput) decInput = output;
  }

  async function run() {
    error = "";
    output = "";
    if (!input) return;
    busy = true;
    try {
      if (keySrc === "pwd") {
        if (!password) return;
        output = mode === "enc"
          ? await aesEncrypt(input, password, { iterations: Number(iterations), keyBytes: Number(keyBits) / 8 })
          : await aesDecrypt(input, password);
      } else {
        let keyBytes;
        try {
          keyBytes = parseKeyMaterial(rawKey);
        } catch {
          error = a.badKey;
          return;
        }
        output = await aesCryptRaw(mode, input, keyBytes, { mode: cipherMode, aad });
      }
    } catch {
      error = keySrc === "pwd" ? a.failed : a.failedRaw;
    } finally {
      busy = false;
    }
  }
  // Password and raw key are secrets — deliberately not persisted.
  persistState("aes", {
    get: () => ({ mode, encInput, decInput, keyBits, iterations, keySrc, cipherMode }),
    set: (v) => {
      mode = v.mode ?? mode;
      encInput = v.encInput ?? encInput;
      decInput = v.decInput ?? decInput;
      keyBits = v.keyBits ?? keyBits;
      iterations = v.iterations ?? iterations;
      keySrc = v.keySrc ?? keySrc;
      cipherMode = v.cipherMode ?? cipherMode;
    },
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <div class="seg">
      <button type="button" class="seg-btn" class:active={mode === "enc"} onclick={() => setMode("enc")}>{a.encrypt}</button>
      <button type="button" class="seg-btn" class:active={mode === "dec"} onclick={() => setMode("dec")}>{a.decrypt}</button>
    </div>
    <label class="dbx-label" for="aes-in">{mode === "enc" ? a.plain : a.cipher}</label>
    {#if mode === "enc"}
      <textarea id="aes-in" class="dbx-textarea mono" rows="5" bind:value={encInput} placeholder={a.plainHint}></textarea>
    {:else}
      <textarea id="aes-in" class="dbx-textarea mono" rows="5" bind:value={decInput} placeholder={a.cipherHint}></textarea>
    {/if}
    <div class="opts">
      <div class="seg">
        <button type="button" class="seg-btn" class:active={keySrc === "pwd"} onclick={() => (keySrc = "pwd")}>{a.srcPassword}</button>
        <button type="button" class="seg-btn" class:active={keySrc === "raw"} onclick={() => (keySrc = "raw")}>{a.srcRaw}</button>
      </div>
      {#if keySrc === "raw"}
        <label>{a.cipherMode}
          <select class="dbx-input narrow" bind:value={cipherMode}>
            <option value="gcm">AES-GCM</option>
            <option value="cbc">AES-CBC</option>
          </select>
        </label>
      {/if}
    </div>
    {#if keySrc === "pwd"}
      <input class="dbx-input" type="password" bind:value={password} placeholder={a.password} />
      {#if mode === "enc"}
        <div class="opts">
          <label>{a.keyLen}
            <select class="dbx-input narrow" bind:value={keyBits}>
              <option value={256}>AES-256</option>
              <option value={128}>AES-128</option>
            </select>
          </label>
          <label>{a.iterations}
            <input class="dbx-input narrow" type="number" min="1000" step="1000" bind:value={iterations} />
          </label>
        </div>
      {/if}
    {:else}
      <div class="keyrow">
        <input class="dbx-input mono" bind:value={rawKey} placeholder={a.rawKey} spellcheck="false" />
        <button type="button" class="dbx-btn" onclick={() => (rawKey = randomKeyHex())}>{a.genKey}</button>
      </div>
      {#if cipherMode === "gcm"}
        <input class="dbx-input mono" bind:value={aad} placeholder={a.aad} spellcheck="false" />
      {/if}
      <p class="hint">{cipherMode === "gcm" ? a.hintGcm : a.hintCbc}</p>
    {/if}
    <div class="actions">
      <button type="button" class="dbx-btn dbx-btn--primary" onclick={run}
        disabled={busy || !input || (keySrc === "pwd" ? !password : !rawKey)}>
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
  .opts { display: flex; gap: 16px; flex-wrap: wrap; }
  .opts label { display: flex; align-items: center; gap: 8px; font-size: 13px; }
  .opts .narrow { width: 130px; }
  .keyrow { display: flex; gap: 8px; }
  .keyrow .dbx-input { flex: 1; }
  .hint { margin: 0; font-size: 12px; color: var(--color-text-secondary, #64748b); }
  .card-head { display: flex; align-items: center; justify-content: space-between; }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; margin: 0; }
</style>
