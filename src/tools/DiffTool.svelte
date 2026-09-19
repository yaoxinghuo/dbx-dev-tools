<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { diffLines, diffChars, diffStats } from "../lib/diff.js";
  import { t, onLangChange } from "../lib/i18n.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.diff);
  const d = $derived(s.diff);

  let mode = $state("lines"); // "lines" | "chars"
  let a = $state("");
  let b = $state("");

  const ops = $derived(mode === "lines" ? diffLines(a, b) : diffChars(a, b));
  const stats = $derived(diffStats(ops, mode === "lines" ? "\n" : ""));
  const empty = $derived(!a && !b);

  const patchText = $derived(
    ops
      .filter((o) => o.op !== "same")
      .map((o) => (o.op === "del" ? "- " : "+ ") + o.text.split("\n").join(o.op === "del" ? "\n- " : "\n+ "))
      .join("\n"),
  );

  // Line mode: expand each op into individual rows for display.
  const rows = $derived(
    mode === "lines"
      ? ops.flatMap((o) => o.text.split("\n").map((line) => ({ op: o.op, line })))
      : [],
  );
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="inputs">
    <div class="dbx-card">
      <label class="dbx-label" for="diff-a">{d.a}</label>
      <textarea id="diff-a" class="dbx-textarea mono" rows="6" bind:value={a}></textarea>
    </div>
    <div class="dbx-card">
      <label class="dbx-label" for="diff-b">{d.b}</label>
      <textarea id="diff-b" class="dbx-textarea mono" rows="6" bind:value={b}></textarea>
    </div>
  </div>

  <div class="toolbar">
    <div class="seg">
      <button type="button" class="seg-btn" class:active={mode === "lines"} onclick={() => (mode = "lines")}>{d.lines}</button>
      <button type="button" class="seg-btn" class:active={mode === "chars"} onclick={() => (mode = "chars")}>{d.chars}</button>
    </div>
    {#if !empty}
      <span class="stat ins">+{stats.ins}</span>
      <span class="stat del">−{stats.del}</span>
      <CopyButton text={patchText} small />
    {/if}
  </div>

  {#if !empty}
    {#if mode === "lines"}
      <div class="diff mono">
        {#each rows as r}
          <div class="row {r.op}"><span class="sign">{r.op === "del" ? "−" : r.op === "ins" ? "+" : " "}</span>{r.line || " "}</div>
        {/each}
      </div>
    {:else}
      <div class="dbx-card diff mono chars">
        {#each ops as o}
          <span class={o.op}>{o.text}</span>
        {/each}
      </div>
    {/if}
  {/if}
</ToolShell>

<style>
  .inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .dbx-card { display: flex; flex-direction: column; gap: 10px; }
  .mono, .diff { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
  .toolbar { display: flex; align-items: center; gap: 12px; margin: 14px 0 10px; }
  .seg { display: flex; border: 1px solid var(--color-border, #e2e8f0); border-radius: 8px; overflow: hidden; }
  .seg-btn { padding: 5px 14px; font-size: 12px; background: transparent; border: none; color: var(--color-text-secondary, #64748b); cursor: pointer; }
  .seg-btn.active { background: var(--color-primary, #3b82f6); color: #fff; }
  .stat { font-size: 12px; font-weight: 600; }
  .stat.ins { color: #16a34a; }
  .stat.del { color: var(--color-destructive, #dc2626); }
  .diff { border: 1px solid var(--color-border, #e2e8f0); border-radius: 10px; overflow: hidden; }
  .row { padding: 1px 10px; white-space: pre-wrap; overflow-wrap: anywhere; display: flex; gap: 6px; }
  .sign { flex: none; width: 12px; text-align: center; }
  .row.del { background: rgba(220, 38, 38, .1); }
  .row.ins { background: rgba(22, 163, 74, .12); }
  .chars { padding: 10px; white-space: pre-wrap; overflow-wrap: anywhere; }
  .chars .del { background: rgba(220, 38, 38, .15); text-decoration: line-through; }
  .chars .ins { background: rgba(22, 163, 74, .18); }
  @media (max-width: 640px) { .inputs { grid-template-columns: 1fr; } }
</style>
