import { useSyncExternalStore } from 'react'

import { getTrafficSnapshot, subscribeTrafficStats } from './collector'

export const useTrafficSnapshot = () =>
  useSyncExternalStore(
    subscribeTrafficStats,
    getTrafficSnapshot,
    getTrafficSnapshot,
  )
