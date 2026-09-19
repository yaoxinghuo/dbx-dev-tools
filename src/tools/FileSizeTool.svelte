<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { t, onLangChange } from "../lib/i18n.js";
  import { parseSize, formatSize, sizeTable, SI_UNITS, IEC_UNITS } from "../lib/filesize.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.filesize);
  const u = $derived(s.filesize);

  let input = $state("");
  let error = $state("");
  let bytes = $state(null);
  let family = $state("iec");

  const iecRows = $derived(bytes === null ? [] : sizeTable(bytes, IEC_UNITS));
  const siRows = $derived(bytes === null ? [] : sizeTable(bytes, SI_UNITS));
  const bestIec = $derived(bytes === null ? "" : formatSize(bytes, IEC_UNITS));
  const bestSi = $derived(bytes === null ? "" : formatSize(bytes, SI_UNITS));
  // Float artifacts ("1.1 KB" → 1100.0000000000002) would leak into the display
  // and the copy buffer; trim to 4 decimals, which is sub-byte precision.
  const bytesStr = $derived(
    bytes === null ? "" : Number.isInteger(bytes) ? String(bytes) : bytes.toFixed(4).replace(/\.?0+$/, ""),
  );

  $effect(() => {
    error = "";
    const text = input;
    if (!text.trim()) {
      bytes = null;
      return;
    }
    const parsed = parseSize(text);
    if (!parsed) {
      bytes = null;
      error = u.invalid;
      return;
    }
    bytes = parsed.bytes;
    family = parsed.family;
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <input class="dbx-input mono" bind:value={input} placeholder={u.placeholder} />
    {#if error}<p class="err">{error}</p>{/if}
  </div>

  {#if bytes !== null}
    <div class="dbx-card">
      <div class="card-head">
        <h2 class="dbx-section-title">{u.result}</h2>
        <CopyButton text={bytesStr} small />
      </div>
      <table class="dbx-table">
        <tbody>
          <tr>
            <td class="k">{u.bytes}</td>
            <td class="v"><code>{bytesStr}</code></td>
            <td class="c"><CopyButton text={bytesStr} small /></td>
          </tr>
          <tr>
            <td class="k">{u.bestIec}</td>
            <td class="v"><code>{bestIec}</code></td>
            <td class="c"><CopyButton text={bestIec} small /></td>
          </tr>
          <tr>
            <td class="k">{u.bestSi}</td>
            <td class="v"><code>{bestSi}</code></td>
            <td class="c"><CopyButton text={bestSi} small /></td>
          </tr>
          <tr>
            <td class="k">{u.detected}</td>
            <td class="v"><code>{family === "si" ? u.familySi : u.familyIec}</code></td>
            <td class="c"></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="dbx-card">
      <h2 class="dbx-section-title">{u.iecTitle}</h2>
      <table class="dbx-table">
        <tbody>
          {#each iecRows as [unit, value]}
            <tr>
              <td class="k">{unit}</td>
              <td class="v"><code>{value}</code></td>
              <td class="c"><CopyButton text={value} small /></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="dbx-card">
      <h2 class="dbx-section-title">{u.siTitle}</h2>
      <table class="dbx-table">
        <tbody>
          {#each siRows as [unit, value]}
            <tr>
              <td class="k">{unit}</td>
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
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
  .k { white-space: nowrap; font-weight: 600; width: 160px; }
  .v code { overflow-wrap: anywhere; }
  .c { width: 60px; text-align: right; }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; margin: 0; }
</style>
