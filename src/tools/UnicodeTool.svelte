<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { t, onLangChange } from "../lib/i18n.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.unicode);
  const u = $derived(s.unicode);

  let input = $state("Aé漢😀‍");

  // Per code point: char, hex/dec, UTF-8 bytes, UTF-16 units, category hint.
  const rows = $derived.by(() => {
    const out = [];
    for (const ch of input) {
      const cp = ch.codePointAt(0);
      const utf8 = [...new TextEncoder().encode(ch)].map((b) => b.toString(16).padStart(2, "0")).join(" ");
      const units = [...ch].map((c) => c.charCodeAt(0).toString(16).padStart(4, "0")).join(" ");
      out.push({ ch, cp, hex: "U+" + cp.toString(16).toUpperCase().padStart(4, "0"), utf8, units });
    }
    return out;
  });

  const counts = $derived.by(() => {
    let bmp = 0, supplementary = 0;
    for (const r of rows) r.cp <= 0xffff ? bmp++ : supplementary++;
    return { total: rows.length, bmp, supplementary };
  });

  const TOTAL = 0x110000;

  function blockOf(cp) {
    // First-plane block name lookup — coarse ranges keep this tiny.
    if (cp < 0x80) return "Basic Latin";
    if (cp < 0x100) return "Latin-1 Supplement";
    if (cp < 0x1800) return "Latin / Greek / Cyrillic…";
    if (cp >= 0x4e00 && cp <= 0x9fff) return "CJK Unified Ideographs";
    if (cp >= 0x3000 && cp <= 0x30ff) return "CJK Symbols / Kana";
    if (cp >= 0xac00 && cp <= 0xd7af) return "Hangul Syllables";
    if (cp >= 0x1f300 && cp <= 0x1faff) return "Emoji";
    if (cp >= 0x1f600 && cp <= 0x1f64f) return "Emoticons";
    if (cp >= 0x10000) return "Supplementary Plane";
    return "Other";
  }
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <label class="dbx-label" for="uni-in">{u.input}</label>
    <input id="uni-in" class="dbx-input mono" bind:value={input} spellcheck="false" />
    {#if counts.total}
      <p class="meta">
        {u.points}: <b>{counts.total}</b> · BMP: {counts.bmp} · {u.supplementary}: {counts.supplementary} ·
        {u.encoded}: {encodeURIComponent(input).length} {u.bytes} · {u.totalSpace}: {TOTAL.toLocaleString()}
      </p>
    {/if}
  </div>

  {#if rows.length}
    <div class="dbx-card table-card">
      <table class="dbx-table">
        <thead><tr><th>{u.colChar}</th><th>{u.colCp}</th><th>{u.colDec}</th><th>UTF-8</th><th>UTF-16</th><th>{u.colBlock}</th></tr></thead>
        <tbody>
          {#each rows as r}
            <tr>
              <td class="ch">{r.ch}</td>
              <td><code>{r.hex}</code></td>
              <td class="dim">{r.cp}</td>
              <td><code class="dim">{r.utf8}</code></td>
              <td><code class="dim">{r.units}</code></td>
              <td class="dim">{blockOf(r.cp)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</ToolShell>

<style>
  .dbx-card { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
  .table-card { padding: 8px 12px; max-height: 420px; overflow: auto; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .ch { font-size: 16px; width: 40px; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
  .dim { color: var(--color-text-secondary, #64748b); font-size: 12px; }
  .meta { margin: 0; font-size: 12px; color: var(--color-text-secondary, #64748b); }
</style>
