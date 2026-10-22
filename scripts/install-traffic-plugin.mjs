/**
 * Installs the traffic sidebar plugin into a Clash Verge Rev checkout.
 *
 * The plugin lives entirely in `src/plugins` plus one `traffic.json` locale per
 * language. The host application only needs a few small registrations, which
 * this script inserts idempotently, so re-running it after updating the plugin
 * is safe. `--check` reports what would change without writing anything.
 *
 * Usage:
 *   node scripts/install-traffic-plugin.mjs                 # patch this checkout
 *   node scripts/install-traffic-plugin.mjs --target <dir>  # patch another checkout
 *   node scripts/install-traffic-plugin.mjs --check         # report only
 */
import { spawnSync } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SOURCE_ROOT = path.resolve(__dirname, '..')
const PLUGIN_DIR = path.join('src', 'plugins')
const PLUGIN_ALIAS = '@/plugins'

const args = process.argv.slice(2)
const hasFlag = (flag) => args.includes(flag)
const readOption = (name) => {
  const index = args.indexOf(name)
  return index === -1 ? undefined : args[index + 1]
}

const CHECK_ONLY = hasFlag('--check')
const targetArg = readOption('--target')
const TARGET_ROOT = path.resolve(SOURCE_ROOT, targetArg ?? '.')
const SAME_CHECKOUT = path.resolve(SOURCE_ROOT) === path.resolve(TARGET_ROOT)

const log = (...parts) => console.log(...parts)

const exists = async (file) => {
  try {
    await fs.access(file)
    return true
  } catch {
    return false
  }
}

const isSelfContainedImport = (line) =>
  /^import\s+['"][^'"]+['"]\s*;?$/.test(line) ||
  /from\s+['"][^'"]+['"]\s*;?$/.test(line)

const fileNewline = (content) => (content.includes('\r\n') ? '\r\n' : '\n')

/** Matches the line ending of the host file so patches do not mix CRLF and LF. */
const matchNewlines = (content, text) =>
  content.includes('\r\n') ? text.replaceAll('\n', '\r\n') : text

const splitLines = (content) => content.split(/\r?\n/)

const IMPORT_SPECIFIER = /(?:from\s+|import\s+)['"]([^'"]+)['"]/

const readSpecifier = (statement) =>
  statement.text.match(IMPORT_SPECIFIER)?.[1] ?? ''

const importGroup = (specifier) =>
  specifier.startsWith('@/')
    ? 'alias'
    : specifier.startsWith('.')
      ? 'relative'
      : 'package'

/** Collects the top-level import statements as line ranges with their specifier. */
const collectImports = (lines) => {
  const statements = []
  let index = 0

  while (index < lines.length) {
    const trimmed = lines[index].trim()
    if (!trimmed) {
      index += 1
      continue
    }
    if (!/^import\b/.test(trimmed)) break

    const start = index
    let end = index
    if (!isSelfContainedImport(trimmed)) {
      while (end < lines.length && !/from\s+['"]/.test(lines[end])) end += 1
      end = Math.min(end, lines.length - 1)
    }

    statements.push({
      start,
      end,
      text: lines.slice(start, end + 1).join(' '),
    })
    index = end + 1
  }

  return statements
}

/**
 * Inserts an import in the alphabetically right place inside its own import
 * group, so the host keeps its grouping and any import-order lint rule happy.
 */
const insertImport = (content, specifier, statement) => {
  const line = statement.trim()
  if (content.includes(line)) return content

  const newline = fileNewline(content)
  const lines = splitLines(content)
  const statements = collectImports(lines)

  if (statements.length === 0) {
    return [line, '', ...lines].join(newline)
  }

  const group = importGroup(specifier)
  const sameGroup = statements.filter(
    (item) => importGroup(readSpecifier(item)) === group,
  )

  let insertAfter = -1
  for (const item of sameGroup) {
    if (readSpecifier(item) < specifier) insertAfter = item.end
  }
  if (insertAfter === -1 && sameGroup.length > 0) {
    insertAfter = sameGroup[0].start - 1
  }
  if (insertAfter === -1) {
    insertAfter = statements[statements.length - 1].end
  }

  lines.splice(insertAfter + 1, 0, line)
  const next = lines[insertAfter + 2]
  if (next?.trim() && !/^import\b/.test(next.trim())) {
    lines.splice(insertAfter + 2, 0, '')
  }
  return lines.join(newline)
}

const findClosingLine = (lines, marker, closing) => {
  const markerIndex = lines.findIndex((line) => line.includes(marker))
  if (markerIndex === -1) return -1
  return lines.findIndex(
    (line, index) => index > markerIndex && line.trim() === closing,
  )
}

/** Inserts whole lines before the line that closes the block containing `marker`. */
const insertLinesBeforeClosing = (content, marker, closing, entries) => {
  const lines = splitLines(content)
  const closingIndex = findClosingLine(lines, marker, closing)
  if (closingIndex === -1) return null
  lines.splice(closingIndex, 0, ...entries)
  return lines.join(fileNewline(content))
}

/** Inserts whole lines after the entry that closes with `closing`. */
const insertLinesAfterEntry = (content, marker, closing, entries) => {
  const lines = splitLines(content)
  const closingIndex = findClosingLine(lines, marker, closing)
  if (closingIndex === -1) return null
  lines.splice(closingIndex + 1, 0, ...entries)
  return lines.join(fileNewline(content))
}

const META_ENTRY =
  '  traffic: { label: trafficPlugin.navLabel, path: trafficPlugin.path },'
const NAV_ENTRY = [
  '  {',
  '    ...navigationItems.traffic,',
  '    icon: trafficPlugin.icons,',
  '    Component: trafficPlugin.Component,',
  '  },',
]

const patchNavigationMeta = (content) => {
  const withImport = insertImport(
    content,
    PLUGIN_ALIAS,
    `import { trafficPlugin } from '${PLUGIN_ALIAS}'`,
  )
  if (withImport.includes(META_ENTRY.trim())) return withImport

  const patched = insertLinesBeforeClosing(
    withImport,
    'export const navigationItems',
    '} as const',
    [META_ENTRY],
  )
  if (!patched) {
    throw new Error('navigationItems closing brace not found')
  }
  return patched
}

const patchNavigation = (content) => {
  const withImport = insertImport(
    content,
    PLUGIN_ALIAS,
    `import { trafficPlugin } from '${PLUGIN_ALIAS}'`,
  )
  if (withImport.includes('...navigationItems.traffic,')) return withImport

  // Keep the sidebar entry next to the logs entry, which is where the design
  // puts it; fall back to the end of the array for unexpected file layouts.
  const afterLogs = insertLinesAfterEntry(
    withImport,
    '...navigationItems.logs,',
    '},',
    NAV_ENTRY,
  )
  if (afterLogs) return afterLogs

  const beforeClosing = insertLinesBeforeClosing(
    withImport,
    'export const navItems',
    ']',
    NAV_ENTRY,
  )
  if (!beforeClosing) {
    throw new Error('navItems closing bracket not found')
  }
  return beforeClosing
}

const patchStartupSections = (content) => {
  if (content.includes("  'traffic',")) return content

  const patched = insertLinesBeforeClosing(
    content,
    'STARTUP_LANGUAGE_SECTIONS = [',
    '] as const',
    ["  'traffic',"],
  )
  if (!patched) {
    throw new Error('STARTUP_LANGUAGE_SECTIONS closing bracket not found')
  }
  return patched
}

const patchMain = (content) => {
  const withImport = insertImport(
    content,
    './plugins',
    "import { startPlugins } from './plugins'",
  )
  if (/^\s*startPlugins\(\)$/m.test(withImport)) return withImport

  const anchorIndex = withImport.indexOf('const initializeApp')
  if (anchorIndex === -1) {
    throw new Error('initializeApp not found')
  }
  const bodyIndex = withImport.indexOf('=> {', anchorIndex)
  if (bodyIndex === -1) {
    throw new Error('initializeApp body not found')
  }
  const insertIndex = bodyIndex + '=> {'.length
  const call = matchNewlines(withImport, '\n  startPlugins()\n')
  return `${withImport.slice(0, insertIndex)}${call}${withImport.slice(insertIndex)}`
}

const PATCHES = [
  {
    file: path.join('src', 'pages', '_navigation-meta.ts'),
    apply: patchNavigationMeta,
  },
  {
    file: path.join('src', 'pages', '_navigation.tsx'),
    apply: patchNavigation,
  },
  {
    file: path.join('src', 'services', 'i18n.ts'),
    apply: patchStartupSections,
  },
  { file: path.join('src', 'main.tsx'), apply: patchMain },
]

const copyPlugin = async () => {
  if (SAME_CHECKOUT) return 'already in place'
  const from = path.join(SOURCE_ROOT, PLUGIN_DIR)
  const to = path.join(TARGET_ROOT, PLUGIN_DIR)
  const targetIndex = path.join(to, 'index.tsx')

  if (CHECK_ONLY) return 'would copy'

  if (await exists(targetIndex)) {
    await fs.cp(path.join(from, 'traffic'), path.join(to, 'traffic'), {
      recursive: true,
      force: true,
    })
    const indexContent = await fs.readFile(targetIndex, 'utf8')
    return indexContent.includes('trafficPlugin')
      ? 'traffic page updated, registry already wired'
      : 'traffic page updated, registry NEEDS MANUAL MERGE'
  }

  await fs.cp(from, to, { recursive: true, force: true })
  return 'copied'
}

const copyLocales = async () => {
  const sourceLocales = path.join(SOURCE_ROOT, 'src', 'locales')
  const targetLocales = path.join(TARGET_ROOT, 'src', 'locales')
  const entries = await fs.readdir(sourceLocales, { withFileTypes: true })
  const copied = []
  const skipped = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const targetDir = path.join(targetLocales, entry.name)
    if (!(await exists(targetDir))) {
      skipped.push(entry.name)
      continue
    }
    copied.push(entry.name)
    if (CHECK_ONLY || SAME_CHECKOUT) continue
    await fs.copyFile(
      path.join(sourceLocales, entry.name, 'traffic.json'),
      path.join(targetDir, 'traffic.json'),
    )
  }

  const verb = SAME_CHECKOUT
    ? 'already in place'
    : CHECK_ONLY
      ? 'would copy'
      : 'copied'
  return { copied, skipped, verb }
}

const INSTALLER_FILE = path.join('scripts', 'install-traffic-plugin.mjs')

// The target needs its own copy to re-run later, e.g. after pulling upstream.
const copyInstaller = async () => {
  if (SAME_CHECKOUT) return 'already in place'
  const to = path.join(TARGET_ROOT, INSTALLER_FILE)
  if (await exists(to)) {
    const [source, target] = await Promise.all([
      fs.readFile(path.join(SOURCE_ROOT, INSTALLER_FILE), 'utf8'),
      fs.readFile(to, 'utf8'),
    ])
    if (source === target) return 'up-to-date'
    if (CHECK_ONLY) return 'would update'
    await fs.writeFile(to, source, 'utf8')
    return 'updated'
  }
  if (CHECK_ONLY) return 'would copy'
  await fs.copyFile(path.join(SOURCE_ROOT, INSTALLER_FILE), to)
  return 'copied'
}

const runPatches = async () => {
  const results = []
  for (const patch of PATCHES) {
    const file = path.join(TARGET_ROOT, patch.file)
    if (!(await exists(file))) {
      results.push({ file: patch.file, status: 'missing-file' })
      continue
    }
    const content = await fs.readFile(file, 'utf8')
    let patched
    try {
      patched = patch.apply(content)
    } catch (error) {
      results.push({ file: patch.file, status: `error: ${error.message}` })
      continue
    }
    const changed = patched !== content
    if (changed && !CHECK_ONLY) {
      await fs.writeFile(file, patched, 'utf8')
    }
    results.push({
      file: patch.file,
      status: changed ? 'patched' : 'up-to-date',
    })
  }
  return results
}

const regenerateI18nKeys = () => {
  if (CHECK_ONLY) return 'skipped (--check)'
  const script = path.join(TARGET_ROOT, 'scripts', 'generate-i18n-keys.mjs')
  const result = spawnSync(process.execPath, [script], {
    cwd: TARGET_ROOT,
    stdio: 'inherit',
  })
  return result.status === 0 ? 'regenerated' : `failed (${result.status})`
}

const main = async () => {
  const plugin = await copyPlugin()
  const locales = await copyLocales()
  const installer = await copyInstaller()
  const patches = await runPatches()
  const i18n = regenerateI18nKeys()

  log(`target: ${TARGET_ROOT}`)
  log(`plugin: ${plugin}`)
  log(
    `locales: ${locales.copied.length} ${locales.verb}, ${locales.skipped.length} skipped`,
  )
  log(`installer: ${installer}`)
  for (const patch of patches) log(`  ${patch.status.padEnd(12)} ${patch.file}`)
  log(`i18n keys: ${i18n}`)

  const failed = patches.filter(
    (patch) =>
      patch.status.startsWith('error') || patch.status === 'missing-file',
  )
  if (failed.length > 0) {
    process.exitCode = 1
    log('\nSome host files could not be patched; register those manually.')
  }
}

main().catch((error) => {
  console.error('Failed to install the traffic plugin:', error)
  process.exitCode = 1
})
