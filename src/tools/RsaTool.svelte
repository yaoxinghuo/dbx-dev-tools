<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { generateRsaPair, rsaCrypt, rsaSign, RsaError, RSA_ALGS, RSA_HASHES, RSA_SIGN_ALGS } from "../lib/rsa.js";
  import { saveFile } from "../lib/bridge.js";
  import { t, onLangChange } from "../lib/i18n.js";
  import { persistState } from "../lib/persist.svelte.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.rsa);
  const r = $derived(s.rsa);

  let alg = $state("RSASSA-PKCS1-v1_5");
  let bits = $state(2048);
  let busy = $state(false);
  let keys = $state(null); // { publicPem, privatePem, ms }
  let error = $state("");

  let sub = $state("gen"); // "gen" | "crypt" | "sign"
  let cryptOp = $state("enc"); // "enc" | "dec"
  let cryptHash = $state("SHA-256");
  let cryptKey = $state("");
  let cryptIn = $state("");
  let cryptOut = $state("");
  let signOp = $state("sign"); // "sign" | "verify"
  let signAlg = $state("RSASSA-PKCS1-v1_5");
  let signHash = $state("SHA-256");
  let signKey = $state("");
  let signIn = $state("");
  let signSig = $state("");
  let signOut = $state("");
  let verifyOk = $state(null); // null | true | false

  async function gen() {
    busy = true;
    error = "";
    try {
      const t0 = performance.now();
      const kp = await generateRsaPair(alg, +bits);
      keys = { ...kp, ms: Math.round(performance.now() - t0) };
    } catch (e) {
      error = e.message || String(e);
      keys = null;
    } finally {
      busy = false;
    }
  }

  function setSub(m) {
    sub = m;
    error = "";
  }

  function errText(e) {
    if (e instanceof RsaError) {
      if (e.code === "toolong") return r.tooLong.replace("{n}", e.detail);
      return { badkey: r.badKey, needpub: r.needPub, needpriv: r.needPriv }[e.code] ?? r.failed;
    }
    return e instanceof DOMException ? r.failed : (e.message || r.failed);
  }

  async function crypt() {
    error = "";
    cryptOut = "";
    if (!cryptIn || !cryptKey) return;
    busy = true;
    try {
      cryptOut = await rsaCrypt(cryptOp, cryptIn, cryptKey, cryptHash);
    } catch (e) {
      error = errText(e);
    } finally {
      busy = false;
    }
  }

  async function sign() {
    error = "";
    signOut = "";
    verifyOk = null;
    if (!signIn || !signKey || (signOp === "verify" && !signSig)) return;
    busy = true;
    try {
      if (signOp === "sign") signOut = await rsaSign("sign", signIn, "", signKey, signAlg, signHash);
      else verifyOk = await rsaSign("verify", signIn, signSig, signKey, signAlg, signHash);
    } catch (e) {
      error = errText(e);
    } finally {
      busy = false;
    }
  }

  function download(name, text) {
    saveFile({ fileName: name, contentType: "application/x-pem-file" }, text);
  }
  // Key material and generated pairs are secrets — persist only parameters.
  persistState("rsa", {
    get: () => ({ alg, bits, sub, cryptOp, cryptHash, signOp, signAlg, signHash }),
    set: (v) => {
      alg = v.alg ?? alg;
      bits = v.bits ?? bits;
      sub = v.sub ?? sub;
      cryptOp = v.cryptOp ?? cryptOp;
      cryptHash = v.cryptHash ?? cryptHash;
      signOp = v.signOp ?? signOp;
      signAlg = v.signAlg ?? signAlg;
      signHash = v.signHash ?? signHash;
    },
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <div class="seg">
      <button type="button" class="seg-btn" class:active={sub === "gen"} onclick={() => setSub("gen")}>{r.modeGen}</button>
      <button type="button" class="seg-btn" class:active={sub === "crypt"} onclick={() => setSub("crypt")}>{r.modeCrypt}</button>
      <button type="button" class="seg-btn" class:active={sub === "sign"} onclick={() => setSub("sign")}>{r.modeSign}</button>
    </div>

    {#if sub === "gen"}
      <div class="row">
        <div class="field">
          <label class="dbx-label" for="rsa-alg">{r.alg}</label>
          <select id="rsa-alg" class="dbx-input" bind:value={alg}>
            {#each Object.keys(RSA_ALGS) as a}
              <option value={a}>{a}{RSA_ALGS[a].kind === "sign" ? ` (${r.sign})` : ` (${r.encrypt})`}</option>
            {/each}
          </select>
        </div>
        <div class="field">
          <label class="dbx-label" for="rsa-bits">{r.bits}</label>
          <select id="rsa-bits" class="dbx-input" bind:value={bits}>
            <option value={2048}>2048</option>
            <option value={3072}>3072</option>
            <option value={4096}>4096</option>
          </select>
        </div>
        <button type="button" class="dbx-btn primary gen-btn" onclick={gen} disabled={busy}>
          {busy ? r.generating : r.generate}
        </button>
      </div>
      {#if +bits === 4096}<p class="hint">{r.slow4096}</p>{/if}
    {/if}

    {#if sub === "crypt"}
      <div class="row">
        <div class="seg">
          <button type="button" class="seg-btn" class:active={cryptOp === "enc"} onclick={() => (cryptOp = "enc")}>{r.cryptEnc}</button>
          <button type="button" class="seg-btn" class:active={cryptOp === "dec"} onclick={() => (cryptOp = "dec")}>{r.decrypt}</button>
        </div>
        <div class="field slim">
          <label class="dbx-label" for="rsa-hash">RSA-OAEP {r.hash}</label>
          <select id="rsa-hash" class="dbx-input" bind:value={cryptHash}>
            {#each RSA_HASHES as h}<option value={h}>{h}</option>{/each}
          </select>
        </div>
      </div>
      <label class="dbx-label" for="rsa-key">{cryptOp === "enc" ? r.publicKey : r.privateKey} {r.keyHint}</label>
      <textarea id="rsa-key" class="dbx-textarea mono" rows="5" bind:value={cryptKey} spellcheck="false"></textarea>
      <label class="dbx-label" for="rsa-io">{cryptOp === "enc" ? r.plaintext : r.ciphertext}</label>
      <textarea id="rsa-io" class="dbx-textarea mono" rows="4" bind:value={cryptIn} spellcheck="false"></textarea>
      <div class="actions">
        <button type="button" class="dbx-btn primary" onclick={crypt} disabled={busy || !cryptIn || !cryptKey}>
          {cryptOp === "enc" ? r.cryptEnc : r.decrypt}
        </button>
      </div>
      {#if cryptOut}
        <div class="head">
          <h2 class="dbx-section-title" style="margin:0">{cryptOp === "enc" ? r.ciphertext : r.plaintext}</h2>
          <CopyButton text={cryptOut} small />
        </div>
        <textarea class="dbx-textarea mono" rows="4" readonly value={cryptOut}></textarea>
      {/if}
    {/if}

    {#if sub === "sign"}
      <div class="row">
        <div class="seg">
          <button type="button" class="seg-btn" class:active={signOp === "sign"} onclick={() => (signOp = "sign")}>{r.signBtn}</button>
          <button type="button" class="seg-btn" class:active={signOp === "verify"} onclick={() => (signOp = "verify")}>{r.verifyBtn}</button>
        </div>
        <div class="field slim">
          <label class="dbx-label" for="rsa-signalg">{r.alg}</label>
          <select id="rsa-signalg" class="dbx-input" bind:value={signAlg}>
            {#each RSA_SIGN_ALGS as a}<option value={a}>{a}</option>{/each}
          </select>
        </div>
        <div class="field slim">
          <label class="dbx-label" for="rsa-signhash">{r.hash}</label>
          <select id="rsa-signhash" class="dbx-input" bind:value={signHash}>
            {#each RSA_HASHES as h}<option value={h}>{h}</option>{/each}
          </select>
        </div>
      </div>
      <label class="dbx-label" for="rsa-skey">{signOp === "sign" ? r.privateKey : r.publicKey} {r.keyHint}</label>
      <textarea id="rsa-skey" class="dbx-textarea mono" rows="5" bind:value={signKey} spellcheck="false"></textarea>
      <label class="dbx-label" for="rsa-msg">{r.message}</label>
      <textarea id="rsa-msg" class="dbx-textarea mono" rows="4" bind:value={signIn} spellcheck="false"></textarea>
      {#if signOp === "verify"}
        <label class="dbx-label" for="rsa-sig">{r.signature}</label>
        <textarea id="rsa-sig" class="dbx-textarea mono" rows="3" bind:value={signSig} spellcheck="false"></textarea>
      {/if}
      <div class="actions">
        <button type="button" class="dbx-btn primary" onclick={sign}
          disabled={busy || !signIn || !signKey || (signOp === "verify" && !signSig)}>
          {signOp === "sign" ? r.signBtn : r.verifyBtn}
        </button>
        {#if verifyOk !== null}
          <span class="badge {verifyOk ? 'ok' : 'bad'}">{verifyOk ? r.verifyOk : r.verifyBad}</span>
        {/if}
      </div>
      {#if signOut}
        <div class="head">
          <h2 class="dbx-section-title" style="margin:0">{r.signature}</h2>
          <CopyButton text={signOut} small />
        </div>
        <textarea class="dbx-textarea mono" rows="3" readonly value={signOut}></textarea>
      {/if}
    {/if}

    {#if error}<p class="err">{error}</p>{/if}
  </div>

  {#if sub === "gen" && keys}
    <div class="dbx-card">
      <div class="head">
        <h2 class="dbx-section-title" style="margin:0">{r.publicKey}</h2>
        <div class="acts">
          <CopyButton text={keys.publicPem} small />
          <button type="button" class="dbx-btn" onclick={() => download("public.pem", keys.publicPem)}>{r.download}</button>
        </div>
      </div>
      <textarea class="dbx-textarea mono" rows="9" readonly value={keys.publicPem}></textarea>
    </div>
    <div class="dbx-card">
      <div class="head">
        <h2 class="dbx-section-title" style="margin:0">{r.privateKey}</h2>
        <div class="acts">
          <CopyButton text={keys.privatePem} small />
          <button type="button" class="dbx-btn" onclick={() => download("private.pem", keys.privatePem)}>{r.download}</button>
        </div>
      </div>
      <textarea class="dbx-textarea mono" rows="16" readonly value={keys.privatePem}></textarea>
      <p class="hint">{r.pkcs8Note} · {keys.ms} ms</p>
    </div>
  {/if}
</ToolShell>

<style>
  .dbx-card { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
  .row { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
  .field { display: flex; flex-direction: column; gap: 6px; min-width: 200px; flex: 1; }
  .field.slim { min-width: 150px; flex: none; }
  .gen-btn { flex: none; }
  .seg { display: flex; border: 1px solid var(--color-border, #e2e8f0); border-radius: 8px; overflow: hidden; width: fit-content; }
  .seg-btn { padding: 6px 16px; font-size: 13px; background: transparent; border: none; color: var(--color-text-secondary, #64748b); cursor: pointer; }
  .seg-btn.active { background: var(--color-primary, #3b82f6); color: #fff; }
  .actions { display: flex; align-items: center; gap: 12px; }
  .badge { display: inline-flex; align-items: center; height: 24px; padding: 0 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
  .badge.ok { background: rgba(22, 163, 74, .15); color: #16a34a; }
  .badge.bad { background: rgba(220, 38, 38, .15); color: var(--color-destructive, #dc2626); }
  .head { display: flex; align-items: center; justify-content: space-between; }
  .acts { display: flex; gap: 8px; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
  .hint { margin: 0; font-size: 12px; color: var(--color-text-secondary, #64748b); }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; margin: 0; }
</style>
