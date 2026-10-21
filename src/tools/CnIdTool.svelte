<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { REGIONS, generateIds, validateId } from "../lib/cnid.js";
  import { t, onLangChange, lang } from "../lib/i18n.js";
  import { persistState } from "../lib/persist.svelte.js";

  let s = $state(t());
  let zh = $state(lang() === "zh");
  onLangChange(() => {
    s = t();
    zh = lang() === "zh";
  });
  const tool = $derived(s.tools.cnid);
  const u = $derived(s.cnid);

  let mode = $state("gen");
  let region = $state(-1);
  let birth = $state("random");
  let age = $state(30);
  let date = $state("1990-01-01");
  let gender = $state("any");
  let count = $state(5);
  let ids = $state([]);

  let vInput = $state("");
  let genErr = $state("");
  const result = $derived(vInput.trim() ? validateId(vInput) : null);

  function generate() {
    const res = generateIds({ region, birth, age, date, gender: gender === "any" ? null : gender, count });
    genErr = res === null ? u.badDateInput : "";
    ids = res || [];
  }

  $effect(() => {
    if (mode === "gen") generate();
  });

  persistState("cnid", {
    get: () => ({ mode, region, birth, age, date, gender }),
    set: (v) => {
      mode = v.mode ?? mode;
      region = v.region ?? region;
      birth = v.birth ?? birth;
      age = v.age ?? age;
      date = v.date ?? date;
      gender = v.gender ?? gender;
    },
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="seg">
    <button type="button" class="seg-btn" class:active={mode === "gen"} onclick={() => (mode = "gen")}>{u.gen}</button>
    <button type="button" class="seg-btn" class:active={mode === "check"} onclick={() => (mode = "check")}>{u.check}</button>
  </div>

  {#if mode === "gen"}
    <div class="dbx-card controls">
      <label>
        <span class="dbx-label">{u.region}</span>
        <select class="dbx-input" bind:value={region}>
          <option value={-1}>{u.regionRandom}</option>
          {#each REGIONS as r, i}
            <option value={i}>{zh ? r.zh : r.en}</option>
          {/each}
        </select>
      </label>
      <label>
        <span class="dbx-label">{u.birth}</span>
        <select class="dbx-input" bind:value={birth}>
          <option value="random">{u.birthRandom}</option>
          <option value="age">{u.birthAge}</option>
          <option value="date">{u.birthDate}</option>
        </select>
      </label>
      {#if birth === "age"}
        <input class="dbx-input narrow" type="number" min="0" max="120" bind:value={age} />
      {:else if birth === "date"}
        <input class="dbx-input mono datein" bind:value={date} placeholder="YYYY-MM-DD" />
      {/if}
      <label>
        <span class="dbx-label">{u.gender}</span>
        <select class="dbx-input" bind:value={gender}>
          <option value="any">{u.genderAny}</option>
          <option value="male">{u.male}</option>
          <option value="female">{u.female}</option>
        </select>
      </label>
      <label>
        <span class="dbx-label">{u.count}</span>
        <input class="dbx-input narrow" type="number" min="1" max="500" bind:value={count} />
      </label>
      <div class="actions">
        <button type="button" class="dbx-btn dbx-btn--primary" onclick={generate}>{s.regenerate}</button>
        <CopyButton text={ids.join("\n")} />
      </div>
    </div>
    {#if genErr}<p class="err">{genErr}</p>{/if}
    <p class="hint">{u.disclaimer}</p>
    <div class="list">
      {#each ids as id}
        <div class="row dbx-card">
          <code>{id}</code>
          <CopyButton text={id} small />
        </div>
      {/each}
    </div>
  {:else}
    <input class="dbx-input mono" bind:value={vInput} placeholder={u.placeholder} />
    {#if result}
      <div class="dbx-card verdict" class:ok={result.valid}>
        <div class="status">{result.valid ? u.valid : u.invalid}</div>
        {#if result.valid && result.parsed}
          <dl>
            <dt>{u.region}</dt><dd>{result.parsed.regionName ? (zh ? result.parsed.regionName.zh : result.parsed.regionName.en) : u.regionUnknown}（{result.parsed.region}）</dd>
            <dt>{u.birthday}</dt><dd>{result.parsed.birth}</dd>
            <dt>{u.ageNow}</dt><dd>{result.parsed.age}</dd>
            <dt>{u.gender}</dt><dd>{result.parsed.gender === "male" ? u.male : u.female}</dd>
            <dt>{u.seq}</dt><dd>{result.parsed.seq}</dd>
          </dl>
          {#if result.legacy}
            <p class="hint">{u.legacyNote}：<code>{result.upgraded}</code></p>
          {/if}
        {:else}
          <ul class="errors">
            {#each result.errors as e}
              <li>{e === "format" ? u.errFormat : e === "date" ? u.errDate : u.errChecksum}</li>
            {/each}
          </ul>
        {/if}
      </div>
    {/if}
  {/if}
</ToolShell>

<style>
  .seg { display: flex; border: 1px solid var(--color-border, #e2e8f0); border-radius: 8px; overflow: hidden; margin-bottom: 14px; width: fit-content; }
  .seg-btn { padding: 6px 14px; font-size: 13px; background: transparent; border: none; color: var(--color-text-secondary, #64748b); cursor: pointer; }
  .seg-btn.active { background: var(--color-primary, #3b82f6); color: #fff; }
  .controls { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 8px; }
  .controls > label { display: flex; align-items: center; gap: 8px; font-size: 13px; white-space: nowrap; }
  .narrow { width: 80px; }
  .datein { width: 130px; }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; margin: 0 0 8px; }
  .actions { display: flex; gap: 8px; margin-left: auto; }
  .hint { color: var(--color-text-secondary, #64748b); font-size: 12px; margin: 0 0 12px; }
  .list { display: flex; flex-direction: column; gap: 8px; }
  .row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 12px; }
  .row code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .verdict { padding: 14px 16px; margin-top: 14px; border-left: 3px solid var(--color-destructive, #dc2626); }
  .verdict.ok { border-left-color: var(--color-success, #16a34a); }
  .status { font-weight: 600; font-size: 14px; margin-bottom: 10px; }
  dl { display: grid; grid-template-columns: auto 1fr; gap: 6px 18px; margin: 0; font-size: 13px; }
  dt { color: var(--color-text-secondary, #64748b); }
  dd { margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .errors { margin: 0; padding-left: 18px; font-size: 13px; }
</style>
