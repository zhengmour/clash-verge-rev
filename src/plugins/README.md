# Sidebar plugins

Self-contained UI plugins that add a page to the Clash Verge sidebar. A plugin
owns its own collector, storage and components; the host only needs a few
registration lines, so the directory can be copied into another checkout of the
same app and rebuilt.

## Available plugins

### `traffic`

Adds a **Traffic** page that breaks the kernel's `/connections` stream down by
process, rule, proxy chain and host, with per-day history (30 days, persisted in
`localStorage`), today/7-day/30-day totals and a daily chart.

mihomo only reports the process name when `find-process-mode` is `always`
(Verge: Settings → Clash Core → Find process mode). With it off, the process
dimension shows a single "Unknown" entry.

## Install into another checkout

The plugin is registered in four host files. `scripts/install-traffic-plugin.mjs`
copies the directory, the locale files and patches those files, then regenerates
the typed i18n keys:

```bash
# preview what would change
node scripts/install-traffic-plugin.mjs --target ../other-clash-verge --check

# apply
node scripts/install-traffic-plugin.mjs --target ../other-clash-verge
```

The script is idempotent: already-applied patches are reported as `up-to-date`,
and running it against an existing `src/plugins/index.tsx` only refreshes the
`traffic` page (the registry is left untouched, or flagged as
`registry NEEDS MANUAL MERGE` when it does not know the plugin). It also copies
itself to `scripts/install-traffic-plugin.mjs` in the target, so the ported
checkout can re-apply the plugin after pulling upstream. Patches keep
the host file's CRLF/LF style, insert the import next to the other `@/` imports
and place the sidebar entry right after the `logs` entry. After it finishes,
rebuild the app (`pnpm build` / `pnpm tauri build`) — the page is regular source
code, so the result is identical to a hand-written page.

Verified on a clean `git archive` of this repository: the patched checkout is
byte-identical to this working tree, and both `tsc --noEmit` and `vite build`
pass.

Patch anchors, for checkouts where the script cannot find them:

| File | Change |
| --- | --- |
| `src/pages/_navigation-meta.ts` | `traffic: { label: trafficPlugin.navLabel, path: trafficPlugin.path }` inside `navigationItems` |
| `src/pages/_navigation.tsx` | add `{ ...navigationItems.traffic, icon: trafficPlugin.icons, Component: trafficPlugin.Component }` to `navItems` |
| `src/services/i18n.ts` | add `'traffic'` to `STARTUP_LANGUAGE_SECTIONS` |
| `src/main.tsx` | call `startPlugins()` inside `initializeApp` |

The entry position in `navItems` is also the default sidebar order, so adding it
after `logs` puts the page before Unlock/Settings. Copy
`src/locales/en/traffic.json` to the matching section of every other language and
run `node scripts/generate-i18n-keys.mjs` afterwards, otherwise the typed `t()`
keys are rejected by `tsc`.

## Remove

Delete `src/plugins`, `src/locales/*/traffic.json`, the four lines above and the
`clash-verge.plugin.traffic/v1` key in `localStorage`.

## Notes

- The collector opens its own `/connections` websocket instead of reusing the
  page hooks, so the page works with any host version that ships
  `tauri-plugin-mihomo-api`.
- `MihomoWebSocket.cleanupAll()` runs on window lifecycle events in `main.tsx`;
  the collector therefore reconnects on its own watchdog (20 s interval, 45 s
  staleness threshold).
- Traffic is attributed to the day the bytes were seen, using the local
  timezone. Data is stored only on this machine.
