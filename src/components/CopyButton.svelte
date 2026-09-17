<script>
  import { copyText } from "../lib/bridge.js";
  import { t, onLangChange } from "../lib/i18n.js";

  let { text = "", small = false } = $props();
  let copied = $state(false);
  let timer;
  let strings = $state(t());
  onLangChange(() => (strings = t()));

  async function doCopy() {
    if (!text) return;
    await copyText(text);
    copied = true;
    clearTimeout(timer);
    timer = setTimeout(() => (copied = false), 1500);
  }
</script>

<button type="button" class="dbx-btn" class:small onclick={doCopy} disabled={!text}>
  {copied ? strings.copied : strings.copy}
</button>

<style>
  .small {
    height: 24px;
    padding: 0 8px;
    font-size: 12px;
  }
</style>
