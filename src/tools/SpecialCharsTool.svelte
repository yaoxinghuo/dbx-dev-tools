<script>
  import ToolShell from "../components/ToolShell.svelte";
  import { copyText } from "../lib/bridge.js";
  import { t, lang, onLangChange } from "../lib/i18n.js";
  import { persistState } from "../lib/persist.svelte.js";
  import { CHAR_CATS, CHARS, codePointOf, htmlEntityOf } from "../lib/chars.js";
  import { isRecentEnabled } from "../lib/prefs.svelte.js";
  import CopyButton from "../components/CopyButton.svelte";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.chars);
  const u = $derived(s.chars);

  const zh = $derived(lang() === "zh");

  let query = $state("");
  let cat = $state("all");
  let recent = $state([]); // array of chars
  let favs = $state([]); // array of chars — pinned, survives past recent's 24-cap
  let picked = $state(null); // { ch, en, zh } last copied

  const norm = (q) => q.trim().toLowerCase();

  const filtered = $derived.by(() => {
    const q = norm(query);
    const all = CHAR_CATS.flatMap((c) => CHARS[c].map(([ch, en, z]) => ({ ch, en, zh: z || en, cat: c })));
    let list = cat === "all" ? all : all.filter((x) => x.cat === cat);
    // Category display name matches too — searching "箭头"/"arrow" surfaces
    // the whole arrows group, which is what the query almost always means.
    if (q) list = list.filter((x) => x.ch === q || x.en.toLowerCase().includes(q) || x.zh.includes(q) || u.cats[x.cat].includes(q) || u.cats[x.cat].toLowerCase().includes(q));
    return list;
  });

  const flatMap = $derived.by(() => {
    const m = new Map();
    for (const c of CHAR_CATS) for (const [ch, en, z] of CHARS[c]) m.set(ch, { ch, en, zh: z || en, cat: c });
    return m;
  });
  const recentItems = $derived(recent.map((ch) => flatMap.get(ch)).filter(Boolean));
  const favItems = $derived(favs.map((ch) => flatMap.get(ch)).filter(Boolean));
  const isFav = $derived(picked ? favs.includes(picked.ch) : false);

  function toggleFav() {
    if (!picked) return;
    favs = favs.includes(picked.ch)
      ? favs.filter((c) => c !== picked.ch)
      : [picked.ch, ...favs].slice(0, 48);
  }

  async function pick(item) {
    picked = item;
    if (isRecentEnabled()) recent = [item.ch, ...recent.filter((c) => c !== item.ch)].slice(0, 24);
    await copyText(item.ch);
  }

  // Off means off: flipping the global recent toggle purges the stored list
  // too — the empty array is what persistState then writes back.
  $effect(() => {
    if (!isRecentEnabled() && recent.length) recent = [];
  });

  persistState("chars", {
    get: () => ({ query, cat, recent, favs }),
    set: (v) => {
      query = v.query ?? query;
      cat = v.cat ?? cat;
      recent = Array.isArray(v.recent) ? v.recent : recent;
      favs = Array.isArray(v.favs) ? v.favs : favs;
    },
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <input class="dbx-input" bind:value={query} placeholder={u.search} spellcheck="false" />
    <div class="cats">
      <button type="button" class="chip" class:on={cat === "all"} onclick={() => (cat = "all")}>{u.all}</button>
      {#each CHAR_CATS as c}
        <button type="button" class="chip" class:on={cat === c} onclick={() => (cat = c)}>{u.cats[c]}</button>
      {/each}
    </div>

    {#if !query && favItems.length}
      <div class="section">
        <span class="dbx-label">{u.fav}</span>
        <div class="grid">
          {#each favItems as x}
            <button type="button" class="cell fav" title="{zh ? x.zh : x.en} {codePointOf(x.ch)}" onclick={() => pick(x)}>{x.ch}</button>
          {/each}
        </div>
      </div>
    {/if}

    {#if !query && isRecentEnabled() && recentItems.length}
      <div class="section">
        <span class="dbx-label">{u.recent}
          <button type="button" class="clear" onclick={() => (recent = [])}>{u.clear}</button>
        </span>
        <div class="grid">
          {#each recentItems as x}
            <button type="button" class="cell" class:fav={favs.includes(x.ch)} title="{zh ? x.zh : x.en} {codePointOf(x.ch)}" onclick={() => pick(x)}>{x.ch}</button>
          {/each}
        </div>
      </div>
    {/if}

    <div class="section">
      <div class="grid">
        {#each filtered as x}
          <button type="button" class="cell" class:fav={favs.includes(x.ch)} title="{zh ? x.zh : x.en} {codePointOf(x.ch)}" onclick={() => pick(x)}>{x.ch}</button>
        {/each}
        {#if !filtered.length}<p class="dim">{u.none}</p>{/if}
      </div>
    </div>

    {#if picked}
      <div class="detail mono">
        <span class="big">{picked.ch}</span>
        <span class="names">{zh ? picked.zh : picked.en}{picked.zh && picked.zh !== picked.en ? ` · ${picked.en}` : ""}</span>
        <code>{codePointOf(picked.ch)}</code>
        <code>{htmlEntityOf(picked.ch)}</code>
        {#if /^:[a-z_0-9]+:$/.test(picked.en)}
          <code class="shortcode">{picked.en}</code>
          <CopyButton text={picked.en} small />
        {/if}
        <button type="button" class="star" class:on={isFav} onclick={toggleFav} title={isFav ? u.unfav : u.favTip}>{isFav ? "★" : "☆"}</button>
      </div>
    {/if}
  </div>
</ToolShell>

<style>
  .dbx-card { display: flex; flex-direction: column; gap: 12px; }
  .cats { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { height: 26px; padding: 0 12px; font-size: 12px; border-radius: 13px; border: 1px solid var(--color-border, #e2e8f0); background: transparent; color: var(--color-text-secondary, #64748b); cursor: pointer; }
  .chip.on { background: var(--color-primary, #3b82f6); border-color: var(--color-primary, #3b82f6); color: #fff; }
  .section { display: flex; flex-direction: column; gap: 6px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(38px, 1fr)); gap: 4px; }
  .cell {
    height: 38px; font-size: 20px; line-height: 1; border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 6px; background: var(--color-background); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
  }
  .cell:hover { border-color: var(--color-primary, #3b82f6); color: var(--color-primary, #3b82f6); }
  .cell:active { transform: scale(.92); }
  .cell.fav { border-color: #d97706; box-shadow: inset 0 0 0 1px #f59e0b33; }
  .star { border: none; background: none; font-size: 20px; cursor: pointer; color: var(--color-text-secondary, #64748b); padding: 0 4px; }
  .star.on { color: #f59e0b; }
  .clear { border: none; background: none; font-size: 11px; cursor: pointer; color: var(--color-text-secondary, #64748b); padding: 0 4px; }
  .clear:hover { color: var(--color-destructive, #dc2626); }
  .shortcode { color: var(--color-primary, #3b82f6); }
  .detail { display: flex; align-items: baseline; gap: 14px; padding: 8px 12px; border: 1px solid var(--color-border, #e2e8f0); border-radius: 8px; flex-wrap: wrap; }
  .detail .big { font-size: 28px; }
  .detail .names { font-family: var(--font-sans, sans-serif); font-size: 13px; }
  .detail code { font-size: 12px; color: var(--color-text-secondary, #64748b); }
  .dim { color: var(--color-text-secondary, #64748b); font-size: 13px; margin: 0; }
</style>
