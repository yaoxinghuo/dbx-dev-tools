<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { toDer, parseCertificate } from "../lib/cert.js";
  import { t, onLangChange } from "../lib/i18n.js";
  import { persistState } from "../lib/persist.svelte.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.cert);
  const c = $derived(s.cert);

  let pem = $state("");
  let fileName = $state("");
  let cert = $state(null);
  let error = $state("");
  let busy = $state(false);

  const p2 = (n) => String(n).padStart(2, "0");
  const fmt = (d) => d ? `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}` : "—";
  const daysLeft = $derived(cert?.notAfter ? Math.floor((cert.notAfter - Date.now()) / 86400000) : null);

  async function inspect(input, name = "") {
    busy = true;
    error = "";
    cert = null;
    try {
      cert = await parseCertificate(toDer(input));
      fileName = name;
    } catch (e) {
      error = e.message === "noPem" ? c.noPem : c.notCert;
    } finally {
      busy = false;
    }
  }

  $effect(() => {
    if (!pem.trim()) { cert = null; error = ""; return; }
    const v = pem;
    const timer = setTimeout(() => inspect(v), 300); // debounce paste typing
    return () => clearTimeout(timer);
  });

  async function pick(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const buf = new Uint8Array(await f.arrayBuffer());
    await inspect(buf, f.name);
  }
  persistState("cert", {
    get: () => ({ pem }),
    set: (v) => { pem = v.pem ?? pem; },
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <label class="dbx-label" for="cert-in">{c.input}</label>
    <textarea id="cert-in" class="dbx-textarea mono" rows="8" bind:value={pem}
      placeholder="-----BEGIN CERTIFICATE-----&#10;…" spellcheck="false"></textarea>
    <div class="row">
      <input type="file" accept=".pem,.crt,.cer,.der" onchange={pick} class="dbx-input" />
    </div>
    {#if error}<p class="err">{error}</p>{/if}
    {#if busy}<p class="dim">{c.parsing}</p>{/if}
  </div>

  {#if cert}
    <div class="dbx-card table-card">
      {#if fileName}<p class="dim" style="margin:0">{fileName}</p>{/if}
      <table class="dbx-table">
        <tbody>
          <tr><td class="k">{c.subject}</td><td class="v"><code>{cert.subject || "—"}</code></td><td class="act"><CopyButton text={cert.subject} small /></td></tr>
          <tr><td class="k">{c.issuer}</td><td class="v"><code>{cert.issuer || "—"}</code></td><td class="act"><CopyButton text={cert.issuer} small /></td></tr>
          <tr><td class="k">{c.serial}</td><td class="v"><code>{cert.serial}</code></td><td class="act"><CopyButton text={cert.serial} small /></td></tr>
          <tr><td class="k">{c.version}</td><td class="v">v{cert.version}</td><td></td></tr>
          <tr>
            <td class="k">{c.validity}</td>
            <td class="v">
              <code>{fmt(cert.notBefore)} → {fmt(cert.notAfter)}</code>
              {#if daysLeft !== null}
                <span class="badge {daysLeft < 0 ? 'bad' : daysLeft < 30 ? 'warn' : 'ok'}">
                  {daysLeft < 0 ? c.expired : `${daysLeft} ${c.daysLeft}`}
                </span>
              {/if}
            </td>
            <td></td>
          </tr>
          <tr><td class="k">{c.sigAlg}</td><td class="v"><code>{cert.signatureAlgorithm}</code></td><td></td></tr>
          <tr><td class="k">{c.publicKey}</td><td class="v"><code>{cert.publicKey}</code></td><td></td></tr>
          {#if cert.san?.length}
            <tr><td class="k">SAN</td><td class="v">{#each cert.san as n}<code class="chip">{n}</code>{/each}</td><td></td></tr>
          {/if}
          <tr>
            <td class="k">{c.flags}</td>
            <td class="v">
              {#if cert.isCA}<span class="badge warn">CA</span>{/if}
              {#if cert.selfSigned}<span class="badge dim-b">{c.selfSigned}</span>{/if}
              {#if !cert.isCA && !cert.selfSigned}<span class="dim">—</span>{/if}
            </td>
            <td></td>
          </tr>
          {#if cert.keyUsage?.length}
            <tr><td class="k">{c.keyUsage}</td><td class="v"><code>{cert.keyUsage.join(", ")}</code></td><td></td></tr>
          {/if}
          {#if cert.eku?.length}
            <tr><td class="k">{c.eku}</td><td class="v"><code>{cert.eku.join(", ")}</code></td><td></td></tr>
          {/if}
          {#if cert.skid}
            <tr><td class="k">{c.skid}</td><td class="v"><code>{cert.skid}</code></td><td class="act"><CopyButton text={cert.skid} small /></td></tr>
          {/if}
          {#if cert.akid}
            <tr><td class="k">{c.akid}</td><td class="v"><code>{cert.akid}</code></td><td class="act"><CopyButton text={cert.akid} small /></td></tr>
          {/if}
          <tr><td class="k">{c.fp256}</td><td class="v"><code>{cert.fingerprintSha256}</code></td><td class="act"><CopyButton text={cert.fingerprintSha256} small /></td></tr>
          <tr><td class="k">{c.fp1}</td><td class="v"><code>{cert.fingerprintSha1}</code></td><td class="act"><CopyButton text={cert.fingerprintSha1} small /></td></tr>
        </tbody>
      </table>
    </div>
  {/if}
</ToolShell>

<style>
  .dbx-card { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
  .k { white-space: nowrap; font-weight: 600; width: 150px; }
  .v code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; word-break: break-all; }
  .act { width: 40px; text-align: right; }
  .chip { display: inline-block; margin: 0 6px 4px 0; padding: 0 6px; background: var(--color-surface-alt, #f1f5f9); border: 1px solid var(--color-border, #e2e8f0); border-radius: 4px; font-size: 12px; }
  .badge { display: inline-flex; align-items: center; height: 20px; padding: 0 8px; border-radius: 999px; font-size: 11px; font-weight: 500; margin-left: 8px; }
  .badge.ok { background: rgba(22, 163, 74, .15); color: #16a34a; }
  .badge.warn { background: rgba(217, 119, 6, .15); color: #d97706; }
  .badge.bad { background: rgba(220, 38, 38, .15); color: var(--color-destructive, #dc2626); }
  .badge.dim-b { background: var(--color-surface-alt, #f1f5f9); color: var(--color-text-secondary, #64748b); }
  .dim { color: var(--color-text-secondary, #64748b); font-size: 12px; }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; margin: 0; }
</style>
