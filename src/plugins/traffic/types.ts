export const trafficDimensions = ['process', 'rule', 'proxy', 'host'] as const

export type TrafficDimension = (typeof trafficDimensions)[number]

/** Sentinel keys are rendered through i18n instead of being shown verbatim. */
export const TRAFFIC_UNKNOWN_KEY = '__unknown__'
export const TRAFFIC_OTHER_KEY = '__other__'

export interface TrafficAmount {
  upload: number
  download: number
}

export interface TrafficCounter extends TrafficAmount {
  connections: number
}

type TrafficDay = Partial<
  Record<TrafficDimension, Record<string, TrafficCounter>>
>

export interface TrafficStore {
  version: 1
  days: Record<string, TrafficDay>
  totals: Record<string, TrafficAmount>
}

export interface TrafficSession {
  upload: number
  download: number
  startedAt: number
  activeConnections: number
  online: boolean
}

export interface TrafficSnapshot {
  store: TrafficStore
  session: TrafficSession
  revision: number
}

export interface TrafficRankedEntry extends TrafficCounter {
  key: string
}
