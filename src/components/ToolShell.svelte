<script>
  let { title = "", desc = "", children } = $props();
</script>

<div class="shell">
  <header>
    <h1>{title}</h1>
    {#if desc}<p class="dbx-hint">{desc}</p>{/if}
  </header>
  <div class="body">
    {@render children?.()}
  </div>
</div>

<style>
  .shell {
    max-width: 860px;
    margin: 0 auto;
    padding: 20px 24px 40px;
  }
  header h1 {
    margin: 0 0 4px;
    font-size: 20px;
    font-weight: 650;
  }
  header {
    margin-bottom: 18px;
  }
  header p {
    margin: 0;
  }
</style>
