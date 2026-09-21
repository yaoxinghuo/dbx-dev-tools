<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { analyze, clean } from "../lib/invis.js";
  import { t, onLangChange } from "../lib/i18n.js";
  import { persistState } from "../lib/persist.svelte.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.invisible);
  const iv = $derived(s.invisible);

  let input = $state("");

  const result = $derived(input ? analyze(input) : null);
  const cleaned = $derived(input ? clean(input) : "");

  const hex = (cp) => "U+" + cp.toString(16).toUpperCase().padStart(4, "0");
  persistState("invis", {
    get: () => ({ input }),
    set: (v) => { input = v.input ?? input; },
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <label class="dbx-label" for="iv-in">{s.input}</label>
    <textarea id="iv-in" class="dbx-textarea" rows="4" bind:value={input} placeholder={iv.placeholder}></textarea>
  </div>

  {#if result}
    {#if result.summary.length}
      <div class="dbx-card">
        <h2 class="dbx-section-title">{iv.view}</h2>
        <div class="view mono">
          {#each result.tokens as tok}
            {#if tok.kind === "char"}
              <span class="inv" title={tok.info.name}>{tok.info.show}</span>
            {:else}
              <span>{tok.text}</span>
            {/if}
          {/each}
        </div>
        <table class="dbx-table">
          <thead>
            <tr><th>{iv.code}</th><th>{iv.name}</th><th class="cnt">{iv.count}</th></tr>
          </thead>
          <tbody>
            {#each result.summary as r}
              <tr>
                <td><code>{hex(r.cp)}</code></td>
                <td>{r.name}</td>
                <td class="cnt">{r.count}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <p class="none">{iv.none}</p>
    {/if}

    {#if cleaned !== input}
      <div class="dbx-card">
        <div class="card-head">
          <h2 class="dbx-section-title">{iv.cleaned}</h2>
          <CopyButton text={cleaned} small />
        </div>
        <pre class="mono out">{cleaned}</pre>
      </div>
    {/if}
  {/if}
</ToolShell>

<style>
  .dbx-card { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }
  .dbx-card:first-child { margin-top: 0; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
  .view { padding: 10px; border: 1px solid var(--color-border, #e2e8f0); border-radius: 8px; white-space: pre-wrap; overflow-wrap: anywhere; }
  .inv { display: inline-block; background: rgba(217, 119, 6, .18); color: #d97706; border-radius: 4px; padding: 0 4px; margin: 0 1px; font-size: 10px; font-weight: 600; }
  .cnt { text-align: right; width: 60px; }
  .card-head { display: flex; align-items: center; justify-content: space-between; }
  .out { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
  .none { color: var(--color-text-secondary, #64748b); font-size: 13px; }
</style>
