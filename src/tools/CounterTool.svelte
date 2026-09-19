<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { t, onLangChange } from "../lib/i18n.js";
  import { textStats } from "../lib/counter.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.counter);
  const u = $derived(s.counter);

  let input = $state("");
  let stats = $state(null);

  // Multi-MB pastes would re-run a dozen regex scans per keystroke; debounce
  // the computation so editing stays responsive.
  $effect(() => {
    const text = input;
    const timer = setTimeout(() => {
      stats = text ? textStats(text) : null;
    }, 150);
    return () => clearTimeout(timer);
  });

  const rows = $derived.by(() => {
    if (!stats) return [];
    const minutes = stats.minutes;
    const reading = minutes < 1 ? "< 1 min" : `${minutes < 10 ? minutes.toFixed(1) : Math.round(minutes)} min`;
    return [
      [u.words, String(stats.words)],
      [u.cjkChars, String(stats.cjk)],
      [u.characters, String(stats.chars)],
      [u.charactersNoSpaces, String(stats.noSpace)],
      [u.letters, String(stats.letters)],
      [u.numbers, String(stats.digits)],
      [u.wordSigns, String(stats.punctuation)],
      [u.whitespace, String(stats.spaces)],
      [u.lines, String(stats.lines)],
      [u.paragraphs, String(stats.paragraphs)],
      [u.sentences, String(stats.sentences)],
      [u.byteSize, `${stats.bytes} B`],
      [u.readingTime, reading],
    ];
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <textarea class="dbx-textarea mono" rows="8" bind:value={input} placeholder={u.placeholder}></textarea>
  </div>

  {#if stats}
    <div class="dbx-card">
      <h2 class="dbx-section-title">{u.results}</h2>
      <table class="dbx-table">
        <tbody>
          {#each rows as [name, value]}
            <tr>
              <td class="k">{name}</td>
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
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
  .k { white-space: nowrap; font-weight: 600; width: 200px; }
  .v code { overflow-wrap: anywhere; }
  .c { width: 60px; text-align: right; }
</style>
