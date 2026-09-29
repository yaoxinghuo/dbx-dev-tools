<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { t, onLangChange } from "../lib/i18n.js";
  import { persistState } from "../lib/persist.svelte.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.url);
  const u = $derived(s.url);

  // Encode and decode keep separate input buffers — flipping modes should not
  // overwrite what the user pasted into the other box.
  let encInput = $state("");
  let decInput = $state("");
  let mode = $state("encode");
  let scope = $state("component");
  let plusSpace = $state(false);
  let output = $state("");
  let error = $state("");
  let urlInfo = $state(null);

  function setMode(m) {
    if (m === mode) return;
    mode = m;
    // Round-trip convenience: an empty target buffer gets seeded with the
    // output we just produced (encode result → decode box, and vice versa).
    if (!output) return;
    if (m === "encode" && !encInput) encInput = output;
    else if (m === "decode" && !decInput) decInput = output;
  }

  function encode(text) {
    const encoded = scope === "component" ? encodeURIComponent(text) : encodeURI(text);
    return plusSpace ? encoded.replaceAll("%20", "+") : encoded;
  }

  function decode(text) {
    const normalized = plusSpace ? text.replaceAll("+", " ") : text;
    return scope === "component" ? decodeURIComponent(normalized) : decodeURI(normalized);
  }

  function parseUrl(text) {
    try {
      const url = new URL(text.trim());
      const parts = [
        ["protocol", url.protocol],
        ["username", url.username],
        ["password", url.password],
        ["host", url.host],
        ["hostname", url.hostname],
        ["port", url.port],
        ["origin", url.origin],
        ["pathname", url.pathname],
        ["search", url.search],
        ["hash", url.hash],
      ].filter(([, v]) => v);
      return { parts, params: [...url.searchParams.entries()] };
    } catch {
      return null;
    }
  }

  $effect(() => {
    error = "";
    urlInfo = null;
    const text = mode === "encode" ? encInput : decInput;
    if (!text.trim()) {
      output = "";
      return;
    }
    // `output` must not be read inside this effect — it is written here, so
    // reading it would make the effect its own dependency and loop forever
    // (effect_update_depth_exceeded froze the whole app in decode mode).
    let next = "";
    try {
      next = mode === "encode" ? encode(text) : decode(text);
    } catch {
      error = u.invalid;
    }
    output = next;
    urlInfo = parseUrl(mode === "encode" ? text : next || text);
  });
  persistState("url", {
    get: () => ({ encInput, decInput, mode, scope, plusSpace }),
    set: (v) => {
      encInput = v.encInput ?? encInput;
      decInput = v.decInput ?? decInput;
      mode = v.mode ?? mode;
      scope = v.scope ?? scope;
      plusSpace = v.plusSpace ?? plusSpace;
    },
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <div class="opts">
      <div class="seg">
        <button type="button" class="dbx-btn" class:dbx-btn--primary={mode === "encode"} onclick={() => setMode("encode")}>{u.encode}</button>
        <button type="button" class="dbx-btn" class:dbx-btn--primary={mode === "decode"} onclick={() => setMode("decode")}>{u.decode}</button>
      </div>
      <select class="dbx-select" bind:value={scope}>
        <option value="component">{u.component}</option>
        <option value="full">{u.full}</option>
      </select>
      <label class="check">
        <input type="checkbox" bind:checked={plusSpace} />
        <span>{u.plusSpace}</span>
      </label>
    </div>
    {#if mode === "encode"}
      <textarea class="dbx-textarea mono" rows="5" bind:value={encInput} placeholder={u.inputPlaceholder}></textarea>
    {:else}
      <textarea class="dbx-textarea mono" rows="5" bind:value={decInput} placeholder={u.inputPlaceholder}></textarea>
    {/if}
    {#if error}<p class="err">{error}</p>{/if}
  </div>

  {#if output}
    <div class="dbx-card">
      <div class="card-head">
        <h2 class="dbx-section-title">{u.output}</h2>
        <CopyButton text={output} small />
      </div>
      <textarea class="dbx-textarea mono" rows="5" readonly value={output}></textarea>
    </div>
  {/if}

  {#if urlInfo}
    <div class="dbx-card">
      <h2 class="dbx-section-title">{u.breakdown}</h2>
      <table class="dbx-table">
        <tbody>
          {#each urlInfo.parts as [name, value]}
            <tr>
              <td class="k"><code>{u.parts[name] || name}</code></td>
              <td class="v"><code>{value}</code></td>
              <td class="c"><CopyButton text={value} small /></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  {#if urlInfo?.params.length}
    <div class="dbx-card">
      <h2 class="dbx-section-title">{u.params}</h2>
      <table class="dbx-table">
        <tbody>
          {#each urlInfo.params as [name, value]}
            <tr>
              <td class="k"><code>{name}</code></td>
              <td class="v"><code>{value}</code></td>
              <td class="c"><CopyButton text={value} small /></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</ToolShell>

<style>
  .dbx-card { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
  .card-head { display: flex; align-items: center; justify-content: space-between; }
  .opts { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .seg { display: flex; gap: 0; }
  .seg .dbx-btn:first-child { border-radius: 6px 0 0 6px; }
  .seg .dbx-btn:last-child { border-radius: 0 6px 6px 0; margin-left: -1px; }
  .check { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
  .k { white-space: nowrap; font-weight: 600; width: 120px; }
  .v code { overflow-wrap: anywhere; }
  .c { width: 60px; text-align: right; }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; margin: 0; }
</style>
