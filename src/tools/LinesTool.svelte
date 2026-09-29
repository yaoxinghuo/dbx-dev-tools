<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { processLines } from "../lib/lines.js";
  import { t, onLangChange } from "../lib/i18n.js";
  import { persistState } from "../lib/persist.svelte.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.lines);
  const l = $derived(s.lines);

  let input = $state("");
  let trim = $state(false);
  let unnumber = $state(false);
  let removeEmpty = $state(false);
  let dedupe = $state(false);
  let sort = $state("none");
  let reverse = $state(false);
  let number = $state(false);
  let find = $state("");
  let replace = $state("");
  let useRegex = $state(false);
  let ignoreCase = $state(false);
  let punct = $state("none");
  let tabs = $state("none");
  let affixMode = $state("none");
  let affix = $state("");
  let colDelim = $state("");
  let colIndex = $state("");
  let lenMin = $state("");
  let lenMax = $state("");

  const output = $derived(processLines(input, {
    trim, unnumber, removeEmpty, dedupe, sort, reverse, number,
    find, replace, useRegex, ignoreCase, punct, tabs,
    affixMode, affix, colDelim, colIndex, lenMin, lenMax,
  }));
  persistState("lines", {
    get: () => ({ input, trim, unnumber, removeEmpty, dedupe, sort, reverse, number,
      find, replace, useRegex, ignoreCase, punct, tabs, affixMode, affix, colDelim, colIndex, lenMin, lenMax }),
    set: (v) => {
      input = v.input ?? input;
      trim = v.trim ?? trim;
      unnumber = v.unnumber ?? unnumber;
      removeEmpty = v.removeEmpty ?? removeEmpty;
      dedupe = v.dedupe ?? dedupe;
      sort = v.sort ?? sort;
      reverse = v.reverse ?? reverse;
      number = v.number ?? number;
      find = v.find ?? find;
      replace = v.replace ?? replace;
      useRegex = v.useRegex ?? useRegex;
      ignoreCase = v.ignoreCase ?? ignoreCase;
      punct = v.punct ?? punct;
      tabs = v.tabs ?? tabs;
      affixMode = v.affixMode ?? affixMode;
      affix = v.affix ?? affix;
      colDelim = v.colDelim ?? colDelim;
      colIndex = v.colIndex ?? colIndex;
      lenMin = v.lenMin ?? lenMin;
      lenMax = v.lenMax ?? lenMax;
    },
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <label class="dbx-label" for="lines-in">{s.input}</label>
    <textarea id="lines-in" class="dbx-textarea mono" rows="7" bind:value={input}></textarea>

    <div class="ops">
      <label class="check"><input type="checkbox" bind:checked={trim} /> {l.trim}</label>
      <label class="check"><input type="checkbox" bind:checked={unnumber} /> {l.unnumber}</label>
      <label class="check"><input type="checkbox" bind:checked={removeEmpty} /> {l.removeEmpty}</label>
      <label class="check"><input type="checkbox" bind:checked={dedupe} /> {l.dedupe}</label>
      <label class="check"><input type="checkbox" bind:checked={reverse} /> {l.reverse}</label>
      <label class="check"><input type="checkbox" bind:checked={number} /> {l.number}</label>
      <select class="dbx-input narrow" bind:value={sort}>
        <option value="none">{l.sortNone}</option>
        <option value="asc">{l.sortAsc}</option>
        <option value="desc">{l.sortDesc}</option>
      </select>
    </div>

    <div class="opgrid">
      <div class="opg">
        <span class="oplabel">{l.findReplace}</span>
        <input class="dbx-input mono grow" bind:value={find} placeholder={l.findPh} spellcheck="false" />
        <input class="dbx-input mono grow" bind:value={replace} placeholder={l.replacePh} spellcheck="false" />
        <label class="check"><input type="checkbox" bind:checked={useRegex} /> {l.regex}</label>
        <label class="check"><input type="checkbox" bind:checked={ignoreCase} /> {l.icase}</label>
      </div>
      <div class="opg">
        <span class="oplabel">{l.affix}</span>
        <select class="dbx-input snip" bind:value={affixMode}>
          <option value="none">{l.off}</option>
          <option value="prefix">{l.prefix}</option>
          <option value="suffix">{l.suffix}</option>
        </select>
        <input class="dbx-input mono grow" bind:value={affix} placeholder={l.affixPh} disabled={affixMode === "none"} />
      </div>
      <div class="opg">
        <span class="oplabel">{l.tabs}</span>
        <select class="dbx-input snip" bind:value={tabs}>
          <option value="none">{l.off}</option>
          <option value="s2t">{l.s2t}</option>
          <option value="t2s">{l.t2s}</option>
        </select>
      </div>
      <div class="opg">
        <span class="oplabel">{l.punct}</span>
        <select class="dbx-input snip" bind:value={punct}>
          <option value="none">{l.off}</option>
          <option value="full">{l.toFull}</option>
          <option value="half">{l.toHalf}</option>
        </select>
      </div>
      <div class="opg">
        <span class="oplabel">{l.column}</span>
        <input class="dbx-input mono tiny" bind:value={colIndex} inputmode="numeric" placeholder="N" />
        <input class="dbx-input mono grow" bind:value={colDelim} placeholder={l.delimPh} spellcheck="false" />
      </div>
      <div class="opg">
        <span class="oplabel">{l.lenFilter}</span>
        <input class="dbx-input mono tiny" bind:value={lenMin} inputmode="numeric" placeholder={l.min} />
        <input class="dbx-input mono tiny" bind:value={lenMax} inputmode="numeric" placeholder={l.max} />
      </div>
    </div>
  </div>

  {#if input}
    <div class="dbx-card">
      <div class="card-head">
        <h2 class="dbx-section-title">{s.output}</h2>
        <CopyButton text={output} small />
      </div>
      <textarea class="dbx-textarea mono" rows="7" value={output} readonly></textarea>
    </div>
  {/if}
</ToolShell>

<style>
  .dbx-card { display: flex; flex-direction: column; gap: 12px; margin-bottom: 14px; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .ops { display: flex; gap: 14px; flex-wrap: wrap; align-items: center; }
  .check { display: flex; align-items: center; gap: 6px; font-size: 13px; white-space: nowrap; }
  .narrow { width: 120px; }
  .opgrid { display: flex; flex-direction: column; gap: 8px; border-top: 1px dashed var(--color-border, #e2e8f0); padding-top: 12px; }
  .opg { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .oplabel { font-size: 12px; font-weight: 600; color: var(--color-text-secondary, #64748b); width: 78px; flex: none; }
  .grow { flex: 1; min-width: 100px; }
  .tiny { width: 56px; flex: none; text-align: center; }
  .snip { width: 96px; flex: none; }
  .card-head { display: flex; align-items: center; justify-content: space-between; }
</style>
