import type { TranslationKey } from '@/types/generated/i18n-keys'
import parseTraffic from '@/utils/parse-traffic'

import {
  TRAFFIC_OTHER_KEY,
  TRAFFIC_UNKNOWN_KEY,
  trafficDimensions,
  type TrafficAmount,
  type TrafficCounter,
  type TrafficDimension,
  type TrafficRankedEntry,
  type TrafficStore,
} from './types'

export const toDayKey = (date: Date = new Date()) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const recentDayKeys = (count: number, now: Date = new Date()) => {
  const keys: string[] = []
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(now)
    date.setDate(date.getDate() - offset)
    keys.push(toDayKey(date))
  }
  return keys
}

export const totalOf = (amount: TrafficAmount) =>
  amount.upload + amount.download

export const formatTraffic = (value: number) => {
  const [amount, unit] = parseTraffic(value)
  return `${amount} ${unit}`.trim()
}

const basename = (path: string) => {
  const segments = path.split(/[\\/]/).filter(Boolean)
  return segments[segments.length - 1] ?? path
}

/**
 * Resolves the aggregation key of a connection for one dimension. Never returns
 * an empty string: missing data falls back to the unknown sentinel so the page
 * can explain why (e.g. find-process-mode is off).
 */
const resolveDimensionKey = (
  connection: IConnectionsItem,
  dimension: TrafficDimension,
): string => {
  const metadata = connection.metadata

  switch (dimension) {
    case 'process': {
      const process = metadata?.process?.trim()
      if (process) return process
      const processPath = metadata?.processPath?.trim()
      return processPath ? basename(processPath) : TRAFFIC_UNKNOWN_KEY
    }
    case 'rule': {
      const rule = connection.rule?.trim()
      if (!rule) return TRAFFIC_UNKNOWN_KEY
      const payload = connection.rulePayload?.trim()
      return payload ? `${rule}(${payload})` : rule
    }
    case 'proxy': {
      // mihomo orders the chain from the outbound proxy to the proxy groups.
      const chain = connection.chains?.find((item) => item?.trim())
      return chain ? chain.trim() : TRAFFIC_UNKNOWN_KEY
    }
    case 'host': {
      const host = metadata?.host?.trim()
      if (host) return host
      return (
        metadata?.destinationIP?.trim() ||
        metadata?.remoteDestination?.trim() ||
        TRAFFIC_UNKNOWN_KEY
      )
    }
  }
}

export const applyTrafficDelta = (
  store: TrafficStore,
  dayKey: string,
  connection: IConnectionsItem,
  delta: TrafficAmount,
  isNewConnection: boolean,
) => {
  const day = store.days[dayKey] ?? {}
  store.days[dayKey] = day

  for (const dimension of trafficDimensions) {
    const key = resolveDimensionKey(connection, dimension)
    const entries = day[dimension] ?? {}
    day[dimension] = entries
    const counter = entries[key] ?? { upload: 0, download: 0, connections: 0 }
    entries[key] = counter
    counter.upload += delta.upload
    counter.download += delta.download
    if (isNewConnection) counter.connections += 1
  }

  const totals = store.totals[dayKey] ?? { upload: 0, download: 0 }
  store.totals[dayKey] = totals
  totals.upload += delta.upload
  totals.download += delta.download
}

export const collectRankedEntries = (
  store: TrafficStore,
  dimension: TrafficDimension,
  dayKeys: string[],
): TrafficRankedEntry[] => {
  const merged = new Map<string, TrafficCounter>()

  for (const dayKey of dayKeys) {
    const entries = store.days[dayKey]?.[dimension]
    if (!entries) continue

    for (const [key, counter] of Object.entries(entries)) {
      const target = merged.get(key)
      if (target) {
        target.upload += counter.upload
        target.download += counter.download
        target.connections += counter.connections
      } else {
        merged.set(key, { ...counter })
      }
    }
  }

  return [...merged.entries()]
    .map(([key, counter]) => ({ key, ...counter }))
    .sort((left, right) => totalOf(right) - totalOf(left))
}

export const collectTotals = (
  store: TrafficStore,
  dayKeys: string[],
): TrafficAmount => {
  const result: TrafficAmount = { upload: 0, download: 0 }
  for (const dayKey of dayKeys) {
    const totals = store.totals[dayKey]
    if (!totals) continue
    result.upload += totals.upload
    result.download += totals.download
  }
  return result
}

export const collectDailyTotals = (store: TrafficStore, dayKeys: string[]) =>
  dayKeys.map((dayKey) => {
    const totals = store.totals[dayKey]
    return {
      dayKey,
      upload: totals?.upload ?? 0,
      download: totals?.download ?? 0,
    }
  })

export const resolveEntryLabel = (
  key: string,
  translate: (key: TranslationKey) => string,
) => {
  if (key === TRAFFIC_UNKNOWN_KEY) return translate('traffic.misc.unknown')
  if (key === TRAFFIC_OTHER_KEY) return translate('traffic.misc.other')
  return key
}
