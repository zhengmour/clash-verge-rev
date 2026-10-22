import { BarChartRounded } from '@mui/icons-material'
import type { ComponentType, ReactNode } from 'react'

import type { TranslationKey } from '@/types/generated/i18n-keys'

import {
  startTrafficCollector,
  stopTrafficCollector,
} from './traffic/collector'
import { TrafficColorfulIcon } from './traffic/icons'
import TrafficPage from './traffic/traffic-page'

/**
 * A self-contained sidebar plugin: the page, its data sources and its
 * navigation metadata all live inside the plugin folder, so importing this
 * registry is the only wiring the host application needs.
 */
export interface VergePlugin {
  id: string
  /** Route path, also used as the stable key of the sidebar entry. */
  path: string
  navLabel: TranslationKey
  /** `[monochrome icon, colorful icon]`, matching `LayoutItem`. */
  icons: ReactNode[]
  Component: ComponentType
  start?: () => void
  stop?: () => void
}

export const trafficPlugin: VergePlugin = {
  id: 'traffic',
  path: '/traffic',
  navLabel: 'traffic.page.title',
  icons: [<BarChartRounded key="mui" />, <TrafficColorfulIcon key="svg" />],
  Component: TrafficPage,
  start: startTrafficCollector,
  stop: stopTrafficCollector,
}

const plugins: VergePlugin[] = [trafficPlugin]

let pluginsStarted = false

export const startPlugins = () => {
  if (pluginsStarted) return
  pluginsStarted = true
  for (const plugin of plugins) plugin.start?.()
}
