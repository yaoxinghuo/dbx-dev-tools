<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { fixMojibake } from "../lib/mojibake.js";
  import { t, onLangChange } from "../lib/i18n.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.mojibake);
  const m = $derived(s.mojibake);

  let input = $state("");
  let picked = $state(0);

  const candidates = $derived(input.trim() ? fixMojibake(input) : []);
  const chosen = $derived(candidates[picked] ?? candidates[0]);
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <label class="dbx-label" for="moji-in">{m.input}</label>
    <textarea id="moji-in" class="dbx-textarea" rows="4" bind:value={input} placeholder={m.placeholder}></textarea>
  </div>

  {#if input.trim() && !candidates.length}
    <p class="none">{m.none}</p>
  {/if}

  {#if candidates.length}
    <div class="dbx-card">
      {#each candidates as c, i}
        <label class="cand" class:sel={chosen === c}>
          <input type="radio" name="moji" checked={chosen === c} onchange={() => (picked = i)} />
          <span class="from">{c.from}</span>
          <code class="preview">{c.result}</code>
          <CopyButton text={c.result} small />
        </label>
      {/each}
    </div>
  {/if}
</ToolShell>

<style>
  .dbx-card { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }
  .dbx-card:first-child { margin-top: 0; }
  .none { color: var(--color-text-secondary, #64748b); font-size: 13px; }
  .cand { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 1px solid var(--color-border, #e2e8f0); border-radius: 8px; cursor: pointer; }
  .cand.sel { border-color: var(--color-primary, #3b82f6); }
  .from { flex: none; font-size: 12px; font-weight: 600; color: var(--color-text-secondary, #64748b); width: 96px; }
  .preview { flex: 1; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; overflow-wrap: anywhere; }
</style>
