<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { generateRsaPair, RSA_ALGS } from "../lib/rsa.js";
  import { t, onLangChange } from "../lib/i18n.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.rsa);
  const r = $derived(s.rsa);

  let alg = $state("RSASSA-PKCS1-v1_5");
  let bits = $state(2048);
  let busy = $state(false);
  let keys = $state(null); // { publicPem, privatePem, ms }
  let error = $state("");

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

  function download(name, text) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "application/x-pem-file" }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
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
    {#if error}<p class="err">{error}</p>{/if}
    {#if +bits === 4096}<p class="hint">{r.slow4096}</p>{/if}
  </div>

  {#if keys}
    <div class="dbx-card">
      <div class="head">
        <h2 class="dbx-section-title" style="margin:0">{r.publicKey}</h2>
        <div class="acts">
          <CopyButton text={keys.publicPem} small />
          <button type="button" class="dbx-btn" onclick={() => download("public.pem", keys.publicPem)}>{r.download}</button>
        </div>
      </div>
      <textarea class="dbx-input mono" rows="9" readonly value={keys.publicPem}></textarea>
    </div>
    <div class="dbx-card">
      <div class="head">
        <h2 class="dbx-section-title" style="margin:0">{r.privateKey}</h2>
        <div class="acts">
          <CopyButton text={keys.privatePem} small />
          <button type="button" class="dbx-btn" onclick={() => download("private.pem", keys.privatePem)}>{r.download}</button>
        </div>
      </div>
      <textarea class="dbx-input mono" rows="14" readonly value={keys.privatePem}></textarea>
      <p class="hint">{r.pkcs8Note} · {keys.ms} ms</p>
    </div>
  {/if}
</ToolShell>

<style>
  .dbx-card { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
  .row { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
  .field { display: flex; flex-direction: column; gap: 6px; min-width: 200px; flex: 1; }
  .gen-btn { flex: none; }
  .head { display: flex; align-items: center; justify-content: space-between; }
  .acts { display: flex; gap: 8px; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
  .hint { margin: 0; font-size: 12px; color: var(--color-text-secondary, #64748b); }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; margin: 0; }
</style>
