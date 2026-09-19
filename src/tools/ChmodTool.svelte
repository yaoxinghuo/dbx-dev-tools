<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { t, onLangChange } from "../lib/i18n.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.chmod);
  const ch = $derived(s.chmod);

  // bits[who][rwx]; who: 0 owner 1 group 2 other
  let bits = $state([[1, 1, 1], [1, 0, 1], [1, 0, 1]]);
  let octalInput = $state("755");
  let octalError = $state("");

  const SYM = ["r", "w", "x"];

  const octal = $derived(bits.map((trip) => trip[0] * 4 + trip[1] * 2 + trip[2]).join(""));

  const symbolic = $derived(
    bits.map((trip) => trip.map((b, i) => (b ? SYM[i] : "-")).join("")).join(""),
  );

  function setOctal() {
    const t = octalInput.trim();
    if (!/^[0-7]{3}$/.test(t)) {
      octalError = ch.invalid;
      return;
    }
    octalError = "";
    bits = [...t].map((d) => {
      const n = Number(d);
      return [n & 4 ? 1 : 0, n & 2 ? 1 : 0, n & 1 ? 1 : 0];
    });
  }

  function applyPreset(v) {
    octalInput = v;
    setOctal();
  }

  const PRESETS = ["755", "644", "700", "600", "777", "400", "664", "750"];
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <div class="grid">
      <span class="hd"></span>
      <span class="hd">r</span>
      <span class="hd">w</span>
      <span class="hd">x</span>
      {#each [ch.owner, ch.group, ch.other] as who, wi}
        <span class="who">{who}</span>
        {#each [0, 1, 2] as bi}
          <input type="checkbox" bind:checked={bits[wi][bi]} />
        {/each}
      {/each}
    </div>

    <div class="row">
      <label class="dbx-label" for="oct-in">{ch.octal}</label>
      <input id="oct-in" class="dbx-input mono narrow" bind:value={octalInput} oninput={setOctal} />
      <code class="mono sym">{symbolic}</code>
      <CopyButton text={octal} small />
      <CopyButton text={symbolic} small />
    </div>
    {#if octalError}<p class="err">{octalError}</p>{/if}

    <div class="presets">
      {#each PRESETS as p}
        <button type="button" class="preset" onclick={() => applyPreset(p)}>{p}</button>
      {/each}
    </div>
  </div>
</ToolShell>

<style>
  .dbx-card { display: flex; flex-direction: column; gap: 14px; }
  .grid { display: grid; grid-template-columns: 70px repeat(3, 28px); gap: 6px; align-items: center; }
  .hd { text-align: center; font-weight: 600; font-size: 13px; }
  .who { font-size: 13px; color: var(--color-text-secondary, #64748b); }
  .grid input { width: 16px; height: 16px; justify-self: center; }
  .row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .narrow { width: 80px; }
  .sym { font-size: 14px; letter-spacing: 1px; }
  .presets { display: flex; gap: 8px; flex-wrap: wrap; }
  .preset { padding: 4px 12px; font-size: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; border: 1px solid var(--color-border, #e2e8f0); border-radius: 6px; background: transparent; color: inherit; cursor: pointer; }
  .preset:hover { border-color: var(--color-primary, #3b82f6); color: var(--color-primary, #3b82f6); }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; margin: 0; }
</style>
