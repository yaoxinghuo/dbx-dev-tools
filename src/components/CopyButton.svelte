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
  <!-- Width is reserved for the longest label ("copied" in every locale),
       so the copy→copied text swap never shifts neighboring content. -->
  <span class="swap">
    <span class="ghost" aria-hidden="true">{strings.copied}</span>
    <span class="lbl">{copied ? strings.copied : strings.copy}</span>
  </span>
</button>

<style>
  button {
    /* Long values next to the button (passwords, UUIDs) would squeeze it
       out of shape in flex rows; a copy button should never shrink. */
    flex-shrink: 0;
    white-space: nowrap;
  }
  .swap {
    display: inline-grid;
    justify-items: center;
  }
  .swap > span {
    grid-area: 1 / 1;
  }
  .ghost {
    visibility: hidden;
  }
  .small {
    height: 24px;
    padding: 0 8px;
    font-size: 12px;
  }
</style>
