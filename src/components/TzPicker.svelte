<script>
  import { TIMEZONES, COMMON_TIMEZONES, tzOffsetLabelAt } from "../lib/time.js";

  // Filterable timezone picker — the native <datalist> dropdown renders
  // cramped and unstyled in WKWebView, so this is a small custom combobox.
  let { value = $bindable(""), placeholder = "" } = $props();

  let open = $state(false);
  let active = $state(0);
  let wrapEl;
  // Only filter by the input's text once the user actually edits it in this
  // open session — an existing selection must not hide the other options.
  let edited = $state(false);

  const MAX = 14;
  const LOCAL = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const NOW = Date.now();
  // Bare-offset candidates like "UTC+08:00" are their own offset label.
  function offsetOf(z) {
    if (/^UTC[+-]/i.test(z)) return "";
    try {
      return tzOffsetLabelAt(NOW, z);
    } catch {
      return "";
    }
  }
  // Offset queries ("+8", "utc-5") reverse-lookup every zone currently at that
  // offset — the bare offset itself is offered first and is a valid value.
  const offsetMatch = $derived(value.trim().match(/^(?:(?:utc|gmt)\s*)?([+-])(\d{1,2})$/i));
  const filtered = $derived.by(() => {
    if (!edited) return [LOCAL, ...COMMON_TIMEZONES.filter((z) => z !== LOCAL), ...TIMEZONES.filter((z) => z !== LOCAL && !COMMON_TIMEZONES.includes(z))].slice(0, MAX);
    const q = value.trim().toLowerCase();
    // Bare digits ("8", "08") mean "zones at ±N hours" — signless, so both
    // directions match and the two fixed-offset values lead the list.
    const bareNum = q.match(/^\d{1,2}$/);
    if (bareNum) {
      const h = +bareNum[0];
      if (h > 14) return [];
      const label = (sign) => `UTC${sign}${String(h).padStart(2, "0")}:00`;
      const at = (sign) => TIMEZONES.filter((z) => tzOffsetLabelAt(NOW, z) === label(sign));
      if (h === 0) return ["UTC", ...at("+")].slice(0, MAX);
      return [label("+"), label("-"), ...at("+"), ...at("-")].slice(0, MAX);
    }
    if (offsetMatch) {
      const h = +offsetMatch[2];
      if (h <= 14) {
        const target = `UTC${offsetMatch[1]}${String(h).padStart(2, "0")}:00`;
        const now = Date.now();
        return [target, ...TIMEZONES.filter((z) => tzOffsetLabelAt(now, z) === target)].slice(0, MAX);
      }
      return [];
    }
    if (!q) return [LOCAL, ...COMMON_TIMEZONES.filter((z) => z !== LOCAL), ...TIMEZONES.filter((z) => z !== LOCAL && !COMMON_TIMEZONES.includes(z))].slice(0, MAX);
    const starts = [];
    const contains = [];
    for (const z of TIMEZONES) {
      const low = z.toLowerCase();
      if (low.startsWith(q)) starts.push(z);
      else if (low.includes(q)) contains.push(z);
      if (starts.length >= MAX) break;
    }
    return [...starts, ...contains].slice(0, MAX);
  });

  function pick(z) {
    value = z;
    open = false;
    edited = false;
  }

  function onKeydown(e) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      open = true;
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") active = Math.min(active + 1, filtered.length - 1);
    else if (e.key === "ArrowUp") active = Math.max(active - 1, 0);
    else if (e.key === "Enter" && filtered[active]) {
      e.preventDefault();
      pick(filtered[active]);
    } else if (e.key === "Escape") open = false;
    else return;
    e.preventDefault();
  }

  // Close when the pointer leaves both the input and the list — blur alone
  // fires before the option's click, so selection uses mousedown instead.
  function onFocusOut(e) {
    if (!wrapEl.contains(e.relatedTarget)) open = false;
  }
</script>

<div class="tzpicker" bind:this={wrapEl} onfocusin={(e) => { open = true; active = 0; edited = false; const el = e.target; requestAnimationFrame(() => el.select?.()); }} onfocusout={onFocusOut}>
  <input class="dbx-input mono" bind:value={value} {placeholder} onkeydown={onKeydown} oninput={() => { open = true; active = 0; edited = true; }} role="combobox" aria-expanded={open} aria-autocomplete="list" />
  {#if open && filtered.length}
    <ul class="tzlist" role="listbox">
      {#each filtered as z, i}
        <li>
          <button type="button" class="tzopt" class:active={i === active} onmousedown={() => pick(z)} onmouseenter={() => (active = i)} role="option" aria-selected={i === active}>
            <span class="name">{z}</span>
            {#if offsetOf(z)}<span class="off">{offsetOf(z)}</span>{/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .tzpicker { position: relative; }
  .tzpicker .dbx-input { width: 100%; }
  .tzlist {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    margin: 0;
    padding: 4px;
    list-style: none;
    background: var(--color-card, #fff);
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 10px;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.18);
    max-height: 280px;
    overflow-y: auto;
    z-index: 50;
  }
  .tzopt {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    text-align: left;
    padding: 6px 10px;
    border: none;
    border-radius: 6px;
    background: transparent;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    color: inherit;
    cursor: pointer;
  }
  .tzopt .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tzopt .off { flex-shrink: 0; color: var(--color-text-secondary, #64748b); font-size: 11px; }
  .tzopt.active { background: var(--color-muted, #f4f4f5); }
</style>
