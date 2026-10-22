import { MihomoWebSocket } from 'tauri-plugin-mihomo-api'

import { applyTrafficDelta, toDayKey } from './aggregate'
import {
  clearTrafficStorage,
  createEmptyTrafficStore,
  loadTrafficStore,
  saveTrafficStore,
} from './storage'
import type { TrafficSession, TrafficSnapshot, TrafficStore } from './types'

const SAMPLE_THROTTLE_MS = 1_000
const NOTIFY_THROTTLE_MS = 500
const PERSIST_DEBOUNCE_MS = 5_000
const RECONNECT_DELAY_MS = 2_000
const WATCHDOG_INTERVAL_MS = 20_000
const STALE_SOCKET_MS = 45_000

interface SeenConnection {
  upload: number
  download: number
}

let started = false
let store: TrafficStore = createEmptyTrafficStore()
let session: TrafficSession = {
  upload: 0,
  download: 0,
  startedAt: Date.now(),
  activeConnections: 0,
  online: false,
}
let revision = 0
let snapshot: TrafficSnapshot = { store, session, revision }

const listeners = new Set<() => void>()

let lastSeen = new Map<string, SeenConnection>()
let lastSampleAt = 0
let connectedAt = 0
let pendingPayload: string | null = null
let sampleTimer: ReturnType<typeof setTimeout> | null = null
let notifyTimer: ReturnType<typeof setTimeout> | null = null
let lastNotifyAt = 0
let persistTimer: ReturnType<typeof setTimeout> | null = null
let socket: MihomoWebSocket | null = null
let connecting = false
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let watchdogTimer: ReturnType<typeof setInterval> | null = null

const publish = (immediate = false) => {
  const notify = () => {
    notifyTimer = null
    lastNotifyAt = Date.now()
    revision += 1
    snapshot = { store, session: { ...session }, revision }
    for (const listener of listeners) listener()
  }

  if (immediate) {
    if (notifyTimer) {
      window.clearTimeout(notifyTimer)
      notifyTimer = null
    }
    notify()
    return
  }

  if (notifyTimer) return

  const elapsed = Date.now() - lastNotifyAt
  if (elapsed >= NOTIFY_THROTTLE_MS) {
    notify()
    return
  }

  notifyTimer = window.setTimeout(notify, NOTIFY_THROTTLE_MS - elapsed)
}

const schedulePersist = () => {
  if (persistTimer) return
  persistTimer = window.setTimeout(() => {
    persistTimer = null
    saveTrafficStore(store)
  }, PERSIST_DEBOUNCE_MS)
}

const flushPersist = () => {
  if (persistTimer) {
    window.clearTimeout(persistTimer)
    persistTimer = null
  }
  saveTrafficStore(store)
}

const handlePageHide = () => {
  flushPersist()
}

const processPayload = (raw: string) => {
  let payload: IConnections
  try {
    payload = JSON.parse(raw) as IConnections
  } catch (error) {
    console.error('[traffic-plugin] Failed to parse connections payload', error)
    return
  }

  const connections = payload.connections ?? []
  const dayKey = toDayKey()
  const nextSeen = new Map<string, SeenConnection>()
  let uploadDelta = 0
  let downloadDelta = 0

  for (const connection of connections) {
    if (!connection?.id) continue

    const upload = connection.upload ?? 0
    const download = connection.download ?? 0
    const previous = lastSeen.get(connection.id)
    nextSeen.set(connection.id, { upload, download })

    const deltaUpload = Math.max(0, upload - (previous?.upload ?? 0))
    const deltaDownload = Math.max(0, download - (previous?.download ?? 0))

    // Idle connections are still tracked so their first byte is not lost.
    if (!previous || deltaUpload > 0 || deltaDownload > 0) {
      applyTrafficDelta(
        store,
        dayKey,
        connection,
        { upload: deltaUpload, download: deltaDownload },
        !previous,
      )
    }

    uploadDelta += deltaUpload
    downloadDelta += deltaDownload
  }

  lastSeen = nextSeen
  lastSampleAt = Date.now()

  session = {
    ...session,
    upload: session.upload + uploadDelta,
    download: session.download + downloadDelta,
    activeConnections: connections.length,
  }

  schedulePersist()
  publish()
}

const flushPendingSample = () => {
  sampleTimer = null
  const payload = pendingPayload
  pendingPayload = null
  if (!payload) return
  processPayload(payload)
}

const enqueueSample = (raw: string) => {
  pendingPayload = raw
  if (sampleTimer) return

  const elapsed = Date.now() - lastSampleAt
  if (elapsed >= SAMPLE_THROTTLE_MS) {
    flushPendingSample()
    return
  }

  sampleTimer = window.setTimeout(
    flushPendingSample,
    SAMPLE_THROTTLE_MS - elapsed,
  )
}

const clearReconnectTimer = () => {
  if (!reconnectTimer) return
  window.clearTimeout(reconnectTimer)
  reconnectTimer = null
}

const scheduleReconnect = () => {
  if (!started || reconnectTimer) return
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null
    void connect()
  }, RECONNECT_DELAY_MS)
}

const closeSocket = async () => {
  const current = socket
  socket = null
  if (!current) return

  try {
    await current.close()
  } catch (error) {
    console.warn('[traffic-plugin] Failed to close websocket', error)
  }
}

const reconnect = async () => {
  await closeSocket()
  session = { ...session, online: false, activeConnections: 0 }
  publish(true)
  scheduleReconnect()
}

const connect = async () => {
  if (socket || connecting || !started) return

  clearReconnectTimer()
  connecting = true

  try {
    const connected = await MihomoWebSocket.connect_connections()
    if (!started) {
      await connected.close()
      return
    }

    socket = connected
    connectedAt = Date.now()
    session = { ...session, online: true }
    publish(true)

    connected.addListener((message) => {
      if (socket !== connected) return
      if (message.type !== 'Text') return
      if (message.data.startsWith('Websocket error')) {
        void reconnect()
        return
      }
      enqueueSample(message.data)
    })
  } catch (error) {
    console.warn('[traffic-plugin] Failed to connect to the mihomo API', error)
    scheduleReconnect()
  } finally {
    connecting = false
  }
}

const handleWatchdog = () => {
  if (!started) return
  if (!socket) {
    void connect()
    return
  }
  // The host closes every websocket on some lifecycle events, and the kernel
  // may restart; reconnect when the stream went silent.
  const lastActivity = Math.max(lastSampleAt, connectedAt)
  if (lastActivity && Date.now() - lastActivity < STALE_SOCKET_MS) return
  void reconnect()
}

export const startTrafficCollector = () => {
  if (started) return
  started = true

  store = loadTrafficStore()
  session = { ...session, startedAt: Date.now() }
  publish(true)

  window.addEventListener('pagehide', handlePageHide)
  watchdogTimer = window.setInterval(handleWatchdog, WATCHDOG_INTERVAL_MS)
  void connect()
}

export const stopTrafficCollector = () => {
  if (!started) return
  started = false

  window.removeEventListener('pagehide', handlePageHide)

  if (watchdogTimer) {
    window.clearInterval(watchdogTimer)
    watchdogTimer = null
  }
  if (sampleTimer) {
    window.clearTimeout(sampleTimer)
    sampleTimer = null
  }
  if (notifyTimer) {
    window.clearTimeout(notifyTimer)
    notifyTimer = null
  }

  clearReconnectTimer()
  flushPersist()
  void closeSocket()
}

export const clearTrafficStats = () => {
  store = createEmptyTrafficStore()
  session = { ...session, upload: 0, download: 0 }
  clearTrafficStorage()
  publish(true)
}

export const getTrafficSnapshot = () => snapshot

export const subscribeTrafficStats = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
