<script>
  import ToolShell from "../components/ToolShell.svelte";
  import CopyButton from "../components/CopyButton.svelte";
  import { parseIpv4Input, ipv4Info, ipv4Split, parseIpv6Input, ipv6Info } from "../lib/ipcalc.js";
  import { t, onLangChange } from "../lib/i18n.js";

  let s = $state(t());
  onLangChange(() => (s = t()));
  const tool = $derived(s.tools.ipcalc);
  const ip = $derived(s.ipcalc);

  let input = $state("192.168.1.10/24");
  let splitBits = $state(0); // 0 = off; set after parse

  const parsed = $derived.by(() => {
    const v = input.trim();
    if (!v) return { kind: "empty" };
    if (v.includes(":")) {
      const p = parseIpv6Input(v);
      return p ? { kind: "v6", info: ipv6Info(p.addr, p.bits) } : { kind: "bad" };
    }
    const p = parseIpv4Input(v);
    return p ? { kind: "v4", info: ipv4Info(p.ip, p.bits), raw: p } : { kind: "bad" };
  });

  const split = $derived.by(() => {
    if (parsed.kind !== "v4" || !splitBits || splitBits <= parsed.info.bits || splitBits > 32) return null;
    return ipv4Split(parsed.raw.ip, parsed.info.bits, splitBits);
  });

  function row(label, value, copy = true) {
    return { label, value, copy };
  }

  const v4Rows = $derived.by(() => {
    if (parsed.kind !== "v4") return [];
    const i = parsed.info;
    return [
      row("CIDR", i.cidr),
      row(ip.network, i.network),
      row(ip.broadcast, i.broadcast),
      row(ip.mask, i.mask),
      row(ip.wildcard, i.wildcard),
      row(ip.hostRange, `${i.firstHost} – ${i.lastHost}`),
      row(ip.hostsUsable, `${i.usable.toLocaleString()}${i.hostsNote ? ` (${ip[i.hostsNote]})` : ""}`),
      row(ip.hostsTotal, i.total.toLocaleString(), false),
      row(ip.cls, i.cls, false),
      row(ip.scope, ip["scope_" + i.scope] || i.scope, false),
      row(ip.ptr, i.ptr),
      row(ip.ipInt, String(i.ipInt)),
    ];
  });
</script>

<ToolShell title={tool.name} desc={tool.desc}>
  <div class="dbx-card">
    <input class="dbx-input mono" bind:value={input} placeholder={ip.placeholder} spellcheck="false" />
    {#if parsed.kind === "bad"}<p class="err">{ip.invalid}</p>{/if}
  </div>

  {#if parsed.kind === "v4"}
    <div class="dbx-card table-card">
      <table class="dbx-table">
        <tbody>
          {#each v4Rows as r}
            <tr>
              <td class="k">{r.label}</td>
              <td class="v"><code>{r.value}</code></td>
              <td class="act">{#if r.copy}<CopyButton text={String(r.value)} small />{/if}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="dbx-card">
      <div class="row">
        <label class="dbx-label" for="ip-split" style="margin:0">{ip.splitTo}</label>
        <select id="ip-split" class="dbx-input narrow" bind:value={splitBits}>
          <option value={0}>—</option>
          {#each Array.from({ length: 32 - parsed.info.bits }, (_, i) => parsed.info.bits + i + 1) as b}
            <option value={b}>/{b}（{2 ** (b - parsed.info.bits)} {ip.subnets}）</option>
          {/each}
        </select>
      </div>
      {#if split}
        <table class="dbx-table">
          <thead><tr><th>{ip.subnetCidr}</th><th>{ip.hostRange}</th><th>{ip.hostsUsable}</th></tr></thead>
          <tbody>
            {#each split.rows as r}
              <tr><td><code class="mono">{r.cidr}</code></td><td><code class="mono dim-v">{r.range}</code></td><td>{r.hosts.toLocaleString()}</td></tr>
            {/each}
          </tbody>
        </table>
        {#if split.truncated}<p class="dim">{ip.truncated}（{split.totalSubnets.toLocaleString()} {ip.subnets}）</p>{/if}
      {/if}
    </div>
  {:else if parsed.kind === "v6"}
    <div class="dbx-card table-card">
      <table class="dbx-table">
        <tbody>
          {#each [
            row(ip.compressed, parsed.info.compressed),
            row(ip.expanded, parsed.info.expanded),
            row(ip.prefix, parsed.info.prefix),
            row(ip.firstAddr, parsed.info.first),
            row(ip.lastAddr, parsed.info.last),
            row(ip.type, ip["type_" + parsed.info.type] || parsed.info.type, false),
            row(ip.ptr, parsed.info.ptr),
            ...(parsed.info.ipv4Mapped ? [row(ip.mappedV4, parsed.info.ipv4Mapped)] : []),
          ] as r}
            <tr>
              <td class="k">{r.label}</td>
              <td class="v"><code>{r.value}</code></td>
              <td class="act">{#if r.copy}<CopyButton text={String(r.value)} small />{/if}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</ToolShell>

<style>
  .dbx-card { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
  .table-card { padding: 8px 12px; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .row { display: flex; gap: 12px; align-items: center; }
  .narrow { width: 200px; flex: none; }
  .k { white-space: nowrap; font-weight: 600; width: 150px; }
  .v code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; word-break: break-all; }
  .act { width: 40px; text-align: right; }
  .dim, .dim-v { color: var(--color-text-secondary, #64748b); font-size: 12px; }
  .err { color: var(--color-destructive, #dc2626); font-size: 13px; margin: 0; }
</style>
