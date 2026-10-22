import { recentDayKeys, totalOf } from './aggregate'
import {
  TRAFFIC_OTHER_KEY,
  trafficDimensions,
  type TrafficCounter,
  type TrafficStore,
} from './types'

const STORAGE_KEY = 'clash-verge.plugin.traffic/v1'
const STORE_VERSION = 1
const TRAFFIC_RETENTION_DAYS = 30
const MAX_ENTRIES_PER_DIMENSION = 240
const QUOTA_FALLBACK_RETENTION = [14, 7, 3, 1, 0]

const getStorage = (): Storage | null => {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export const createEmptyTrafficStore = (): TrafficStore => ({
  version: STORE_VERSION,
  days: {},
  totals: {},
})

const toFiniteNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0

const sanitizeDay = (raw: unknown): TrafficStore['days'][string] | null => {
  if (!raw || typeof raw !== 'object') return null
  const source = raw as Record<string, unknown>
  const day: TrafficStore['days'][string] = {}

  for (const dimension of trafficDimensions) {
    const entries = source[dimension]
    if (!entries || typeof entries !== 'object') continue

    const sanitized: Record<string, TrafficCounter> = {}
    for (const [key, value] of Object.entries(entries as object)) {
      if (!value || typeof value !== 'object') continue
      const counter = value as Record<string, unknown>
      sanitized[key] = {
        upload: toFiniteNumber(counter.upload),
        download: toFiniteNumber(counter.download),
        connections: toFiniteNumber(counter.connections),
      }
    }

    if (Object.keys(sanitized).length) day[dimension] = sanitized
  }

  return day
}

const sanitizeStore = (raw: unknown): TrafficStore => {
  if (!raw || typeof raw !== 'object') return createEmptyTrafficStore()
  const source = raw as Record<string, unknown>
  if (source.version !== STORE_VERSION) return createEmptyTrafficStore()

  const store = createEmptyTrafficStore()

  if (source.days && typeof source.days === 'object') {
    for (const [dayKey, value] of Object.entries(source.days as object)) {
      const day = sanitizeDay(value)
      if (day) store.days[dayKey] = day
    }
  }

  if (source.totals && typeof source.totals === 'object') {
    for (const [dayKey, value] of Object.entries(source.totals as object)) {
      if (!value || typeof value !== 'object') continue
      const totals = value as Record<string, unknown>
      store.totals[dayKey] = {
        upload: toFiniteNumber(totals.upload),
        download: toFiniteNumber(totals.download),
      }
    }
  }

  return store
}

const foldDimension = (
  entries: Record<string, TrafficCounter>,
): Record<string, TrafficCounter> => {
  const keys = Object.keys(entries)
  if (keys.length <= MAX_ENTRIES_PER_DIMENSION) return entries

  const ranked = keys
    .map((key) => ({ key, counter: entries[key] }))
    .sort((left, right) => totalOf(right.counter) - totalOf(left.counter))

  const kept: Record<string, TrafficCounter> = {}
  const other: TrafficCounter = { upload: 0, download: 0, connections: 0 }

  for (const [index, item] of ranked.entries()) {
    if (index < MAX_ENTRIES_PER_DIMENSION) {
      kept[item.key] = item.counter
      continue
    }
    other.upload += item.counter.upload
    other.download += item.counter.download
    other.connections += item.counter.connections
  }

  const previous = entries[TRAFFIC_OTHER_KEY]
  if (previous) {
    other.upload += previous.upload
    other.download += previous.download
    other.connections += previous.connections
  }

  kept[TRAFFIC_OTHER_KEY] = other
  return kept
}

/**
 * Drops expired days and caps the entry count of every dimension. Mutates and
 * returns the store so callers can persist the pruned result directly.
 */
const pruneTrafficStore = (
  store: TrafficStore,
  retentionDays: number = TRAFFIC_RETENTION_DAYS,
) => {
  const keep = new Set(recentDayKeys(Math.max(retentionDays, 1)))

  for (const dayKey of Object.keys(store.days)) {
    if (!keep.has(dayKey)) delete store.days[dayKey]
  }
  for (const dayKey of Object.keys(store.totals)) {
    if (!keep.has(dayKey)) delete store.totals[dayKey]
  }

  for (const [dayKey, day] of Object.entries(store.days)) {
    for (const dimension of trafficDimensions) {
      const entries = day[dimension]
      if (!entries) continue
      const folded = foldDimension(entries)
      if (Object.keys(folded).length) day[dimension] = folded
      else delete day[dimension]
    }
    if (!Object.keys(day).length) delete store.days[dayKey]
  }

  return store
}

export const loadTrafficStore = (): TrafficStore => {
  const storage = getStorage()
  if (!storage) return createEmptyTrafficStore()

  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return createEmptyTrafficStore()
    return pruneTrafficStore(sanitizeStore(JSON.parse(raw) as unknown))
  } catch (error) {
    console.warn(
      '[traffic-plugin] Failed to load statistics, starting empty',
      error,
    )
    return createEmptyTrafficStore()
  }
}

const writeStore = (store: TrafficStore) => {
  const storage = getStorage()
  if (!storage) return false

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(store))
    return true
  } catch {
    return false
  }
}

/**
 * Persists the store, shrinking the retention window when WebView storage quota
 * is exhausted. Returns whether anything could be written.
 */
export const saveTrafficStore = (store: TrafficStore) => {
  pruneTrafficStore(store)
  if (writeStore(store)) return true

  for (const retentionDays of QUOTA_FALLBACK_RETENTION) {
    pruneTrafficStore(store, retentionDays)
    if (writeStore(store)) {
      console.warn(
        `[traffic-plugin] Storage quota reached, kept ${retentionDays} day(s) of history`,
      )
      return true
    }
  }

  console.warn(
    '[traffic-plugin] Storage quota reached, statistics are memory only',
  )
  return false
}

export const clearTrafficStorage = () => {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn('[traffic-plugin] Failed to clear statistics', error)
  }
}
