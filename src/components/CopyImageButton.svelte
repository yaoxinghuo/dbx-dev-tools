<script>
  import { copyImage } from "../lib/bridge.js";
  import { t, onLangChange } from "../lib/i18n.js";

  // getBytes: async () => Uint8Array of PNG data. Kept lazy so callers don't
  // re-encode on every render — only when the user actually clicks.
  let { getBytes } = $props();
  let state = $state("idle"); // idle | ok | fail
  let timer;
  let strings = $state(t());
  onLangChange(() => (strings = t()));

  // Hide only when the host positively says it can't: a present capabilities
  // object without the flag means a production host predating host.copyImage.
  // No capabilities object at all (dev host) → unknown, keep the button and
  // let a failure report itself.
  const unsupported = $derived(
    typeof window !== "undefined" && !!window.dbxPlugin?.capabilities && !window.dbxPlugin.capabilities.clipboardImageWrite
  );

  async function doCopy() {
    let ok = false;
    try {
      const bytes = await getBytes();
      ok = !!bytes && (await copyImage(bytes));
    } catch {}
    state = ok ? "ok" : "fail";
    clearTimeout(timer);
    timer = setTimeout(() => (state = "idle"), 1500);
  }
</script>

{#if !unsupported}
<button type="button" class="dbx-btn" onclick={doCopy}>
  <span class="swap">
    <span class="ghost" aria-hidden="true">{strings.copyImage}</span>
    <span class="lbl">{state === "ok" ? strings.copied : state === "fail" ? strings.copyFail : strings.copyImage}</span>
  </span>
</button>
{/if}

<style>
  button { flex-shrink: 0; white-space: nowrap; }
  .swap { display: inline-grid; justify-items: center; }
  .swap > span { grid-area: 1 / 1; }
  .ghost { visibility: hidden; }
</style>
