<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { saveFile } from "../lib/bridge.js";
  import { t, onLangChange } from "../lib/i18n.js";
  import { persistState } from "../lib/persist.svelte.js";
  import { parseJsonRaw, stringifyJson } from "../lib/json.js";
  import { recordsToCsv, csvToRecords, jsonToNdjson, ndjsonToJson, jsonToXml, xmlToJson, jsonToYaml } from "../lib/dataconv.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.dataconv);
  const u = $derived(s.dataconv);

  let input = $state("");
  let from = $state("json");
  let to = $state("csv");
  let output = $state("");
  let error = $state("");

  const FROM_FORMATS = ["json", "csv", "tsv", "ndjson", "xml"];
  const TO_FORMATS = ["json", "csv", "tsv", "ndjson", "xml", "yaml"];
  const EXT = { json: "json", csv: "csv", tsv: "tsv", ndjson: "ndjson", xml: "xml", yaml: "yaml" };

  function convert(text, from, to) {
    let v;
    if (from === "json") {
      const r = parseJsonRaw(text);
      if (!r.ok) throw new Error("json");
      v = r.value;
    } else if (from === "csv" || from === "tsv") v = csvToRecords(text, from === "csv" ? "," : "\t");
    else if (from === "ndjson") v = ndjsonToJson(text);
    else v = xmlToJson(text);

    if (to === "json") return stringifyJson(v, 2);
    if (to === "ndjson") return jsonToNdjson(v);
    if (to === "xml") return jsonToXml(v);
    if (to === "yaml") return jsonToYaml(v);
    const rows = Array.isArray(v) ? v : [v];
    if (rows.some((r) => r === null || typeof r !== "object" || Array.isArray(r))) {
      throw new Error("shape");
    }
    return recordsToCsv(rows, to === "csv" ? "," : "\t");
  }

  $effect(() => {
    error = "";
    output = "";
    // Sample all inputs synchronously — reads inside the timer callback are
    // not tracked, so format switches alone must still invalidate the effect.
    const text = input.trim();
    const f = from;
    const t_ = to;
    if (!text) return;
    const timer = setTimeout(() => {
      try {
        output = convert(text, f, t_);
      } catch (e) {
        output = "";
        error = e.message === "shape" ? u.shapeErr : u.convErr;
      }
    }, 200);
    return () => clearTimeout(timer);
  });

  function download() {
    if (!output) return;
    saveFile({ fileName: `converted.${EXT[to]}`, contentType: "text/plain" }, new TextEncoder().encode(output));
  }
  persistState("dataconv", {
    get: () => ({ input, from, to }),
    set: (v) => {
      input = v.input ?? input;
      from = v.from ?? from;
      to = v.to ?? to;
    },
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <div class="conv-row">
      <select class="dbx-select" bind:value={from}>
        {#each FROM_FORMATS as f}<option value={f}>{f.toUpperCase()}</option>{/each}
      </select>
      <span class="arrow">→</span>
      <select class="dbx-select" bind:value={to}>
        {#each TO_FORMATS as f}<option value={f}>{f.toUpperCase()}</option>{/each}
      </select>
    </div>
    <textarea class="dbx-textarea mono" rows="8" bind:value={input} placeholder={u.placeholder} spellcheck="false"></textarea>
    {#if error}<p class="err">{error}</p>{/if}
  </div>

  {#if output}
    <div class="dbx-card">
      <div class="card-head">
        <h2 class="dbx-section-title">{s.output}</h2>
        <div class="acts">
          <button type="button" class="dbx-btn small" onclick={download}>{u.download}</button>
          <CopyButton text={output} small />
        </div>
      </div>
      <textarea class="dbx-textarea mono" rows="10" readonly value={output}></textarea>
    </div>
  {/if}
</ToolShell>

<style>
  .dbx-card { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
  .conv-row { display: flex; align-items: center; gap: 10px; }
  .conv-row .dbx-select { min-width: 120px; }
  .arrow { color: var(--color-text-secondary, #64748b); font-size: 16px; }
  .card-head { display: flex; align-items: center; justify-content: space-between; }
  .acts { display: flex; gap: 6px; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; margin: 0; }
</style>
