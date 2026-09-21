<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { base32ToBytes, parseOtpauth, totp } from "../lib/totp.js";
  import { t, onLangChange } from "../lib/i18n.js";
  import { persistState } from "../lib/persist.svelte.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.totp);
  const v = $derived(s.totp);

  let secret = $state("JBSWY3DPEHPK3PXP");
  let otpauth = $state("");
  let digits = $state(6);
  let period = $state(30);
  let algorithm = $state("SHA1");
  let code = $state("");
  let error = $state("");
  let remaining = $state(0);
  let progress = $state(0);
  let label = $state("");
  let timer = null;

  // Pasting an otpauth:// URI imports its parameters into the fields (once).
  let importedUri = "";
  function importOtpauth() {
    const text = (otpauth || "").trim();
    if (!text.toLowerCase().startsWith("otpauth://") || text === importedUri) return;
    const p = parseOtpauth(text);
    if (!p) return;
    importedUri = text;
    secret = p.secret;
    digits = p.digits;
    period = p.period;
    algorithm = p.algorithm === "SHA256" || p.algorithm === "SHA512" ? p.algorithm : "SHA1";
    label = p.issuer || p.account ? `${p.issuer}${p.account ? " · " + p.account : ""}` : "";
  }

  async function tick() {
    importOtpauth();
    const s = secret.trim();
    if (!s) { code = ""; return; }
    try {
      const bytes = base32ToBytes(s);
      if (!bytes.length) throw new Error("empty");
      const result = await totp(bytes, algorithm, digits, period);
      code = result.code;
      error = "";
      remaining = Math.max(0, Math.ceil((result.expiresAt - Date.now()) / 1000));
      progress = remaining / period;
    } catch {
      code = "";
      error = v.invalidSecret;
    }
  }

  $effect(() => {
    clearInterval(timer);
    tick();
    timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  });
  // The secret / otpauth URI are deliberately not persisted — they are credentials.
  persistState("totp", {
    get: () => ({ digits, period, algorithm }),
    set: (v) => {
      digits = v.digits ?? digits;
      period = v.period ?? period;
      algorithm = v.algorithm ?? algorithm;
    },
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card controls">
    <label class="dbx-label" for="totp-secret">{v.secret}</label>
    <input id="totp-secret" class="dbx-input mono" bind:value={secret} placeholder="JBSWY3DPEHPK3PXP" spellcheck="false" />
    <label class="dbx-label" for="totp-uri">{v.otpauth}</label>
    <input id="totp-uri" class="dbx-input mono" bind:value={otpauth} placeholder="otpauth://totp/…" spellcheck="false" />
    <div class="opts">
      <div class="opt">
        <label class="dbx-label" for="totp-digits">{v.digits}</label>
        <select id="totp-digits" class="dbx-input narrow" bind:value={digits}>
          <option value={6}>6</option><option value={7}>7</option><option value={8}>8</option>
        </select>
      </div>
      <div class="opt">
        <label class="dbx-label" for="totp-period">{v.period}</label>
        <input id="totp-period" type="number" min="1" max="600" class="dbx-input narrow" bind:value={period} />
      </div>
      <div class="opt">
        <label class="dbx-label" for="totp-algo">{v.algorithm}</label>
        <select id="totp-algo" class="dbx-input narrow" bind:value={algorithm}>
          <option value="SHA1">SHA-1</option><option value="SHA256">SHA-256</option><option value="SHA512">SHA-512</option>
        </select>
      </div>
    </div>
    {#if label}<p class="meta">{label}</p>{/if}
    {#if error}<p class="err">{error}</p>{/if}
  </div>

  {#if code}
    <div class="dbx-card code-card">
      <div class="code-row">
        <span class="code">{code.slice(0, Math.ceil(code.length / 2))} <b>{code.slice(Math.ceil(code.length / 2))}</b></span>
        <CopyButton text={code} />
      </div>
      <div class="bar"><div class="fill" style="width:{progress * 100}%"></div></div>
      <p class="meta">{v.expiresIn} {remaining}s</p>
    </div>
  {/if}
</ToolShell>

<style>
  .controls { display: flex; flex-direction: column; gap: 12px; }
  .opts { display: flex; gap: 16px; flex-wrap: wrap; }
  .opt { display: flex; gap: 8px; align-items: center; }
  .narrow { width: 110px; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .meta { margin: 0; font-size: 12px; color: var(--color-text-secondary, #64748b); }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; margin: 0; }
  .code-card { align-items: center; }
  .code-row { display: flex; align-items: center; gap: 16px; }
  .code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 34px; letter-spacing: 0.12em; }
  .bar { width: 100%; height: 4px; background: var(--color-muted, #f1f5f9); border-radius: 999px; overflow: hidden; }
  .fill { height: 100%; background: var(--color-primary, #3b82f6); transition: width 1s linear; }
</style>
