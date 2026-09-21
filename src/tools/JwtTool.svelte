<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { t, onLangChange } from "../lib/i18n.js";
  import { persistState } from "../lib/persist.svelte.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.jwt);
  const j = $derived(s.jwt);

  const TIME_CLAIMS = new Set(["exp", "iat", "nbf", "auth_time"]);
  const ALG_HASH = { HS256: "SHA-256", HS384: "SHA-384", HS512: "SHA-512" };

  let mode = $state("parse"); // "parse" | "generate"
  let input = $state("");
  let secret = $state("");
  let error = $state("");
  let headerJson = $state("");
  let payloadJson = $state("");
  let alg = $state("");
  let signatureB64 = $state("");
  let signingInput = $state("");
  let claims = $state([]);
  let verifyState = $state(""); // "" | "valid" | "invalid" | "unsupported"

  let genPayload = $state('{\n  "sub": "1234567890",\n  "name": "Terry",\n  "iat": 1700000000\n}');
  let genAlg = $state("HS256");
  let genSecret = $state("");
  let genToken = $state("");
  let genError = $state("");

  function b64urlBytes(segment) {
    let normalized = segment.replaceAll("-", "+").replaceAll("_", "/");
    const rem = normalized.length % 4;
    if (rem) normalized += "=".repeat(4 - rem);
    return Uint8Array.from(atob(normalized), (c) => c.charCodeAt(0));
  }

  function b64urlEncode(bytes) {
    let s = "";
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  }

  async function generate() {
    genError = "";
    genToken = "";
    let payload;
    try {
      payload = JSON.parse(genPayload);
    } catch {
      genError = j.badJson;
      return;
    }
    if (!genSecret) return;
    try {
      const te = new TextEncoder();
      const head = b64urlEncode(te.encode(JSON.stringify({ alg: genAlg, typ: "JWT" })));
      const body = b64urlEncode(te.encode(JSON.stringify(payload)));
      const si = `${head}.${body}`;
      const key = await crypto.subtle.importKey(
        "raw",
        te.encode(genSecret),
        { name: "HMAC", hash: { name: ALG_HASH[genAlg] } },
        false,
        ["sign"],
      );
      const sig = await crypto.subtle.sign("HMAC", key, te.encode(si));
      genToken = `${si}.${b64urlEncode(new Uint8Array(sig))}`;
    } catch {
      genError = j.genFailed;
    }
  }

  $effect(() => {
    error = "";
    verifyState = "";
    headerJson = payloadJson = alg = signatureB64 = signingInput = "";
    claims = [];
    const token = input.trim();
    if (!token) return;
    try {
      const parts = token.split(".");
      if (parts.length !== 3) throw new Error("bad parts");
      const header = JSON.parse(new TextDecoder().decode(b64urlBytes(parts[0])));
      const payload = JSON.parse(new TextDecoder().decode(b64urlBytes(parts[1])));
      alg = header.alg || "";
      headerJson = JSON.stringify(header, null, 2);
      payloadJson = JSON.stringify(payload, null, 2);
      signatureB64 = parts[2];
      signingInput = `${parts[0]}.${parts[1]}`;
      const now = Date.now() / 1000;
      claims = Object.entries(payload).map(([key, value]) => {
        let display = typeof value === "object" ? JSON.stringify(value) : String(value);
        let status = "";
        if (TIME_CLAIMS.has(key) && typeof value === "number" && Number.isFinite(value)) {
          display = `${value} · ${new Date(value * 1000).toLocaleString()}`;
          if (key === "exp") status = value < now ? "expired" : "valid";
          else if (key === "nbf") status = value > now ? "notyet" : "valid";
        }
        return { key, display, status };
      });
    } catch {
      error = j.invalid;
    }
  });

  async function verify() {
    const hash = ALG_HASH[alg];
    if (!hash) {
      verifyState = "unsupported";
      return;
    }
    try {
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: { name: hash } },
        false,
        ["verify"],
      );
      const ok = await crypto.subtle.verify(
        "HMAC",
        key,
        b64urlBytes(signatureB64),
        new TextEncoder().encode(signingInput),
      );
      verifyState = ok ? "valid" : "invalid";
    } catch {
      verifyState = "invalid";
    }
  }
  // Secrets (verify secret, signing secret) are deliberately not persisted.
  persistState("jwt", {
    get: () => ({ mode, input, alg, genPayload, genAlg }),
    set: (v) => {
      mode = v.mode ?? mode;
      input = v.input ?? input;
      alg = v.alg ?? alg;
      genPayload = v.genPayload ?? genPayload;
      genAlg = v.genAlg ?? genAlg;
    },
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <div class="seg">
      <button type="button" class="seg-btn" class:active={mode === "parse"} onclick={() => (mode = "parse")}>{j.parse}</button>
      <button type="button" class="seg-btn" class:active={mode === "generate"} onclick={() => (mode = "generate")}>{j.generate}</button>
    </div>

    {#if mode === "parse"}
      <label class="dbx-label" for="jwt-in">JWT</label>
      <textarea id="jwt-in" class="dbx-textarea mono" rows="4" bind:value={input} placeholder={j.placeholder}></textarea>
      {#if error}<p class="err">{error}</p>{/if}
    {:else}
      <label class="dbx-label" for="jwt-payload">{j.payload}</label>
      <textarea id="jwt-payload" class="dbx-textarea mono" rows="6" bind:value={genPayload}></textarea>
      <div class="gen-row">
        <select class="dbx-input narrow" bind:value={genAlg}>
          {#each Object.keys(ALG_HASH) as a}<option value={a}>{a}</option>{/each}
        </select>
        <input class="dbx-input" bind:value={genSecret} placeholder={j.secret} />
        <button type="button" class="dbx-btn dbx-btn--primary" onclick={generate} disabled={!genSecret}>{j.generate}</button>
      </div>
      {#if genError}<p class="err">{genError}</p>{/if}
      {#if genToken}
        <div class="card-head">
          <h2 class="dbx-section-title">JWT</h2>
          <CopyButton text={genToken} small />
        </div>
        <code class="mono sig">{genToken}</code>
      {/if}
    {/if}
  </div>

  {#if mode === "parse" && headerJson}
    <div class="dbx-card">
      <div class="card-head">
        <h2 class="dbx-section-title">{j.header}</h2>
        <CopyButton text={headerJson} small />
      </div>
      <pre class="mono">{headerJson}</pre>
    </div>
    <div class="dbx-card">
      <div class="card-head">
        <h2 class="dbx-section-title">{j.payload}</h2>
        <CopyButton text={payloadJson} small />
      </div>
      {#if claims.length}
        <table class="dbx-table">
          <tbody>
            {#each claims as c}
              <tr>
                <td class="k">{c.key}</td>
                <td class="v"><code>{c.display}</code></td>
                <td class="badge-cell">
                  {#if c.status === "expired"}<span class="badge bad">{j.expired}</span>
                  {:else if c.status === "notyet"}<span class="badge warn">{j.notYet}</span>
                  {:else if c.status === "valid"}<span class="badge ok">{j.validUntil}</span>{/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
    <div class="dbx-card">
      <div class="card-head">
        <h2 class="dbx-section-title">{j.signature}</h2>
        <CopyButton text={signatureB64} small />
      </div>
      <code class="mono sig">{signatureB64}</code>
      <div class="verify">
        <input class="dbx-input" bind:value={secret} placeholder={j.secret} />
        <button type="button" class="dbx-btn" onclick={verify} disabled={!secret}>{j.verify}</button>
        {#if verifyState === "valid"}<span class="badge ok">{j.valid}</span>
        {:else if verifyState === "invalid"}<span class="badge bad">{j.badSig}</span>
        {:else if verifyState === "unsupported"}<span class="badge warn">{j.unsupported}</span>{/if}
      </div>
    </div>
  {/if}
</ToolShell>

<style>
  .dbx-card { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
  .card-head { display: flex; align-items: center; justify-content: space-between; }
  .mono, pre.mono, code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
  pre.mono { margin: 0; overflow-x: auto; white-space: pre-wrap; overflow-wrap: anywhere; }
  .k { white-space: nowrap; font-weight: 600; width: 90px; }
  .v code { overflow-wrap: anywhere; }
  .badge-cell { width: 110px; text-align: right; }
  .badge { display: inline-flex; align-items: center; height: 20px; padding: 0 8px; border-radius: 999px; font-size: 11px; font-weight: 500; }
  .badge.ok { background: rgba(22, 163, 74, .15); color: #16a34a; }
  .badge.bad { background: rgba(220, 38, 38, .15); color: var(--color-destructive, #dc2626); }
  .badge.warn { background: rgba(217, 119, 6, .15); color: #d97706; }
  .sig { overflow-wrap: anywhere; }
  .verify { display: flex; gap: 8px; align-items: center; }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; margin: 0; }
  .seg { display: flex; border: 1px solid var(--color-border, #e2e8f0); border-radius: 8px; overflow: hidden; width: fit-content; }
  .seg-btn { padding: 6px 16px; font-size: 13px; background: transparent; border: none; color: var(--color-text-secondary, #64748b); cursor: pointer; }
  .seg-btn.active { background: var(--color-primary, #3b82f6); color: #fff; }
  .gen-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .gen-row .dbx-input:not(.narrow) { flex: 1; min-width: 160px; }
  .narrow { width: 110px; flex: none; }
</style>
