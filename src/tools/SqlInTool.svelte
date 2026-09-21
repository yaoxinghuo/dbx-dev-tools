<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { t, onLangChange } from "../lib/i18n.js";
  import { persistState } from "../lib/persist.svelte.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.sqlin);
  const q = $derived(s.sqlin);

  let input = $state("alice\nbob\n'carol'\n");
  let quote = $state("single"); // single | double | backtick | none
  let parenthesize = $state(true);
  let dedupe = $state(true);
  let sort = $state(false);
  let skipEmpty = $state(true);

  const CHARS = { single: "'", double: '"', backtick: "`", none: "" };

  const list = $derived.by(() => {
    let lines = input.split(/\r?\n/);
    if (skipEmpty) lines = lines.map((l) => l.trim()).filter((l) => l !== "");
    if (dedupe) lines = [...new Set(lines)];
    if (sort) lines.sort((a, b) => a.localeCompare(b));
    const ch = CHARS[quote];
    return lines.map((l) => (ch ? ch + l.replaceAll(ch, ch + ch) + ch : l));
  });

  const output = $derived(list.length ? list.join(", ") : "");
  const outputSql = $derived(parenthesize && list.length > 1 ? `(${output})` : output);
  persistState("sqlin", {
    get: () => ({ input, quote, parenthesize, dedupe, sort, skipEmpty }),
    set: (v) => {
      input = v.input ?? input;
      quote = v.quote ?? quote;
      parenthesize = v.parenthesize ?? parenthesize;
      dedupe = v.dedupe ?? dedupe;
      sort = v.sort ?? sort;
      skipEmpty = v.skipEmpty ?? skipEmpty;
    },
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card controls">
    <div class="opts">
      {#each Object.keys(CHARS) as k}
        <label class="check"><input type="radio" bind:group={quote} value={k} /> {q["quote_" + k]}</label>
      {/each}
    </div>
    <div class="opts">
      <label class="check"><input type="checkbox" bind:checked={parenthesize} /> {q.parenthesize}</label>
      <label class="check"><input type="checkbox" bind:checked={dedupe} /> {q.dedupe}</label>
      <label class="check"><input type="checkbox" bind:checked={sort} /> {q.sort}</label>
      <label class="check"><input type="checkbox" bind:checked={skipEmpty} /> {q.skipEmpty}</label>
    </div>
    <label class="dbx-label" for="si-in">{q.lines}</label>
    <textarea id="si-in" class="dbx-textarea mono" rows="6" bind:value={input} placeholder={"alice\nbob\ncarol"} spellcheck="false"></textarea>
  </div>

  {#if list.length}
    <div class="dbx-card">
      <div class="out-head">
        <label class="dbx-label" for="si-out">{q.result} ({list.length})</label>
        <CopyButton text={outputSql} small />
      </div>
      <textarea id="si-out" class="dbx-textarea mono" rows="3" readonly value={outputSql}></textarea>
    </div>
  {/if}
</ToolShell>

<style>
  .controls { display: flex; flex-direction: column; gap: 12px; }
  .opts { display: flex; gap: 18px; flex-wrap: wrap; }
  .check { display: flex; align-items: center; gap: 8px; font-size: 13px; }
  .out-head { display: flex; align-items: center; justify-content: space-between; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
</style>
