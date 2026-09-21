<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { hashText, hashBuffer, hmacBuffer } from "../lib/crypto.js";
  import { formatSize, IEC_UNITS } from "../lib/filesize.js";
  import { t, onLangChange } from "../lib/i18n.js";
  import { persistState } from "../lib/persist.svelte.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.hash);
  const h = $derived(s.hash);

  let mode = $state("text"); // "text" | "file"
  let input = $state("");
  let fileInfo = $state(null); // {name, size, buffer}
  let key = $state("");
  let uppercase = $state(false);
  let results = $state([]);

  function pickFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    f.arrayBuffer().then((buffer) => {
      fileInfo = { name: f.name, size: f.size, buffer };
    });
  }

  let seq = 0;
  $effect(() => {
    const run = ++seq;
    const done = (r) => { if (run === seq) results = r; };
    const data = mode === "file" ? fileInfo?.buffer : input ? new TextEncoder().encode(input).buffer : null;
    if (!data) {
      results = [];
      return;
    }
    const job = key
      ? hmacBuffer(data, key)
      : mode === "file" ? hashBuffer(data) : hashText(input);
    job.then(done);
  });

  const shown = $derived(results.map((r) => ({ ...r, hex: uppercase ? r.hex.toUpperCase() : r.hex })));
  // The HMAC key is deliberately not persisted — it is a secret.
  persistState("hash", {
    get: () => ({ mode, input, uppercase }),
    set: (v) => {
      mode = v.mode ?? mode;
      input = v.input ?? input;
      uppercase = v.uppercase ?? uppercase;
    },
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <div class="seg">
      <button type="button" class="seg-btn" class:active={mode === "text"} onclick={() => (mode = "text")}>{h.textMode}</button>
      <button type="button" class="seg-btn" class:active={mode === "file"} onclick={() => (mode = "file")}>{h.fileMode}</button>
    </div>
    {#if mode === "text"}
      <textarea class="dbx-textarea" rows="5" bind:value={input} placeholder={h.placeholder}></textarea>
    {:else}
      <input type="file" class="dbx-input" onchange={pickFile} />
      {#if fileInfo}
        <p class="file-meta">{fileInfo.name} · {formatSize(fileInfo.size, IEC_UNITS)}</p>
      {/if}
    {/if}
    <input class="dbx-input" bind:value={key} placeholder={h.key} />
    <label class="check"><input type="checkbox" bind:checked={uppercase} /> {h.uppercase}</label>
  </div>

  {#if shown.length}
    <div class="dbx-card table-card">
      <table class="dbx-table">
        <tbody>
          {#each shown as r}
            <tr>
              <td class="algo">{r.name}</td>
              <td class="digest"><code>{r.hex}</code></td>
              <td class="act"><CopyButton text={r.hex} small /></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</ToolShell>

<style>
  .dbx-card { display: flex; flex-direction: column; gap: 12px; }
  .check { display: flex; align-items: center; gap: 8px; font-size: 13px; }
  .table-card { margin-top: 18px; }
  .algo { white-space: nowrap; font-weight: 600; width: 110px; }
  .digest code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; overflow-wrap: anywhere; }
  .act { width: 60px; text-align: right; }
  .seg { display: flex; gap: 0; border: 1px solid var(--color-border, #e2e8f0); border-radius: 8px; overflow: hidden; width: fit-content; }
  .seg-btn { padding: 6px 16px; font-size: 13px; background: transparent; border: none; color: var(--color-text-secondary, #64748b); cursor: pointer; }
  .seg-btn.active { background: var(--color-primary, #3b82f6); color: #fff; }
  .file-meta { margin: 0; font-size: 13px; color: var(--color-text-secondary, #64748b); }
</style>
