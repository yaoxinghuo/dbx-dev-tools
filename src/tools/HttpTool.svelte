<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { parseHeaders, headersToJson, jsonToHeaders } from "../lib/http.js";
  import { STATUS_CODES, HTTP_HEADERS } from "../lib/httpref.js";
  import { t, lang, onLangChange } from "../lib/i18n.js";
  import { persistState } from "../lib/persist.svelte.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.http);
  const h = $derived(s.http);

  let tab = $state("format"); // format | ref
  let direction = $state("h2j"); // h2j: headers->json | j2h: json->headers
  let input = $state("");

  const parsed = $derived.by(() => {
    if (!input.trim()) return null;
    if (direction === "h2j") {
      const { headers, skipped } = parseHeaders(input);
      return { headers, skipped, json: headersToJson(headers) };
    }
    try {
      return { text: jsonToHeaders(input) };
    } catch (e) {
      return { err: e.message };
    }
  });

  // ── Reference tab ────────────────────────────────────────────────────────
  let query = $state("");
  const zh = $derived(lang() === "zh");
  const q = $derived(query.trim().toLowerCase());
  const match = (arr) => arr.filter((row) => !q || row[0].toLowerCase().includes(q) || row[1].toLowerCase().includes(q) || (row[2] || "").includes(q));
  const codes = $derived(match(STATUS_CODES));
  const headers = $derived(match(HTTP_HEADERS));

  persistState("http", {
    get: () => ({ tab, direction, input }),
    set: (v) => {
      tab = v.tab ?? tab;
      direction = v.direction ?? direction;
      input = v.input ?? input;
    },
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="seg">
    <button type="button" class="seg-btn" class:active={tab === "format"} onclick={() => (tab = "format")}>{h.tabFormat}</button>
    <button type="button" class="seg-btn" class:active={tab === "ref"} onclick={() => (tab = "ref")}>{h.tabRef}</button>
  </div>

  {#if tab === "format"}
    <div class="dbx-card">
      <div class="opts">
        <label class="check"><input type="radio" bind:group={direction} value="h2j" /> {h.h2j}</label>
        <label class="check"><input type="radio" bind:group={direction} value="j2h" /> {h.j2h}</label>
      </div>
      <textarea
        class="dbx-input mono area"
        rows="8"
        bind:value={input}
        placeholder={direction === "h2j" ? h.h2jPlaceholder : h.j2hPlaceholder}
      ></textarea>
    </div>

    {#if parsed}
      {#if direction === "h2j"}
        {#if parsed.headers.length}
          <div class="dbx-card table-card">
            <div class="cardhead">
              <h2 class="dbx-section-title">{h.parsedTable}</h2>
              <CopyButton text={parsed.json} small />
            </div>
            <table class="dbx-table">
              <tbody>
                {#each parsed.headers as [name, value]}
                  <tr>
                    <td class="k">{name}</td>
                    <td class="v"><code>{value}</code></td>
                    <td class="act"><CopyButton text={`${name}: ${value}`} small /></td>
                  </tr>
                {/each}
              </tbody>
            </table>
            {#if parsed.skipped.length}
              <p class="warn">{h.skippedLines}: {parsed.skipped.map((x) => x[0]).join(", ")}</p>
            {/if}
          </div>
          <div class="dbx-card table-card">
            <div class="cardhead">
              <h2 class="dbx-section-title">JSON</h2>
              <CopyButton text={parsed.json} small />
            </div>
            <pre class="jsonout mono">{parsed.json}</pre>
          </div>
        {:else}
          <p class="warn">{h.noHeaders}</p>
        {/if}
      {:else}
        {#if parsed.err}
          <p class="err">{h.badJson}: {parsed.err}</p>
        {:else}
          <div class="dbx-card table-card">
            <div class="cardhead">
              <h2 class="dbx-section-title">{h.rawOut}</h2>
              <CopyButton text={parsed.text} small />
            </div>
            <pre class="jsonout mono">{parsed.text}</pre>
          </div>
        {/if}
      {/if}
    {/if}
  {:else}
    <div class="dbx-card">
      <input class="dbx-input mono" bind:value={query} placeholder={h.refPlaceholder} />
    </div>

    <div class="dbx-card table-card">
      <h2 class="dbx-section-title">{h.statusCodes} ({codes.length})</h2>
      <table class="dbx-table">
        <tbody>
          {#each codes as [code, en, zhText]}
            <tr>
              <td class="k code">{code}</td>
              <td class="v">{en}{#if zh && zhText} — {zhText}{/if}</td>
              <td class="act"><CopyButton text={code} small /></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="dbx-card table-card">
      <h2 class="dbx-section-title">{h.headersRef} ({headers.length})</h2>
      <table class="dbx-table">
        <tbody>
          {#each headers as [name, en, zhText]}
            <tr>
              <td class="k">{name}</td>
              <td class="v">{zh && zhText ? zhText : en}</td>
              <td class="act"><CopyButton text={name} small /></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</ToolShell>

<style>
  .seg { display: inline-flex; border: 1px solid var(--color-border, #e2e8f0); border-radius: 8px; overflow: hidden; margin-bottom: 14px; }
  .seg-btn { padding: 6px 14px; font-size: 13px; background: transparent; border: none; color: var(--color-text-secondary, #64748b); cursor: pointer; }
  .seg-btn.active { background: var(--color-primary, #3b82f6); color: #fff; }
  .dbx-card { display: flex; flex-direction: column; gap: 10px; }
  .table-card { margin-top: 16px; }
  .opts { display: flex; gap: 12px; align-items: center; }
  .area { resize: vertical; min-height: 120px; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
  .cardhead { display: flex; align-items: center; justify-content: space-between; }
  .k { white-space: nowrap; font-weight: 600; }
  .k.code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--color-primary, #0d9488); }
  .v code { overflow-wrap: anywhere; }
  .act { width: 60px; text-align: right; }
  .jsonout { margin: 0; padding: 10px; background: var(--color-muted, #f4f4f5); border-radius: 8px; overflow-x: auto; white-space: pre; }
  .warn { color: var(--color-warning, #d97706); font-size: 12px; margin: 0; }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; margin: 0; }
</style>
