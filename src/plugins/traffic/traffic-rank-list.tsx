import { Box, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { VirtualList } from '@/components/base'

import { formatTraffic, resolveEntryLabel, totalOf } from './aggregate'
import type { TrafficRankedEntry } from './types'

const ROW_HEIGHT = 46

interface TrafficRankListProps {
  entries: TrafficRankedEntry[]
  /** Range total, so a search keeps absolute shares instead of rescaling to 100%. */
  total: number
  /** Largest entry in the range, so the inline bars keep their scale. */
  peak: number
}

export const TrafficRankList = ({
  entries,
  total: shownTotal,
  peak,
}: TrafficRankListProps) => {
  const { t } = useTranslation()

  return (
    <Box
      sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.25,
          height: 30,
          borderBottom: '1px solid',
          borderColor: 'divider',
          color: 'text.secondary',
        }}
      >
        <Typography sx={{ width: 28, fontSize: '0.75em' }}>#</Typography>
        <Typography sx={{ flex: 1, fontSize: '0.75em' }}>
          {t('traffic.table.name')}
        </Typography>
        <Typography sx={{ width: 82, textAlign: 'right', fontSize: '0.75em' }}>
          {t('traffic.table.upload')}
        </Typography>
        <Typography sx={{ width: 82, textAlign: 'right', fontSize: '0.75em' }}>
          {t('traffic.table.download')}
        </Typography>
        <Typography sx={{ width: 88, textAlign: 'right', fontSize: '0.75em' }}>
          {t('traffic.table.total')}
        </Typography>
        <Typography sx={{ width: 56, textAlign: 'right', fontSize: '0.75em' }}>
          {t('traffic.table.connections')}
        </Typography>
        <Typography sx={{ width: 52, textAlign: 'right', fontSize: '0.75em' }}>
          {t('traffic.table.share')}
        </Typography>
      </Box>

      <VirtualList
        count={entries.length}
        estimateSize={ROW_HEIGHT}
        getItemKey={(index) => entries[index].key}
        style={{ flex: 1 }}
        renderItem={(index) => {
          const entry = entries[index]
          const total = totalOf(entry)
          const share = shownTotal > 0 ? (total / shownTotal) * 100 : 0
          const barWidth = peak > 0 ? Math.max((total / peak) * 100, 1) : 0

          return (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.25,
                height: ROW_HEIGHT,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography
                sx={{ width: 28, fontSize: '0.75em', color: 'text.secondary' }}
              >
                {index + 1}
              </Typography>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  noWrap
                  title={resolveEntryLabel(entry.key, t)}
                  sx={{ fontSize: '0.85em' }}
                >
                  {resolveEntryLabel(entry.key, t)}
                </Typography>
                <Box
                  sx={{
                    mt: 0.4,
                    height: 3,
                    borderRadius: 2,
                    bgcolor: 'action.hover',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      width: `${barWidth}%`,
                      height: '100%',
                      bgcolor: index === 0 ? 'primary.main' : 'primary.light',
                    }}
                  />
                </Box>
              </Box>
              <Typography
                noWrap
                sx={{
                  width: 82,
                  textAlign: 'right',
                  fontSize: '0.75em',
                  color: 'warning.main',
                }}
              >
                {formatTraffic(entry.upload)}
              </Typography>
              <Typography
                noWrap
                sx={{
                  width: 82,
                  textAlign: 'right',
                  fontSize: '0.75em',
                  color: 'primary.main',
                }}
              >
                {formatTraffic(entry.download)}
              </Typography>
              <Typography
                noWrap
                sx={{
                  width: 88,
                  textAlign: 'right',
                  fontSize: '0.8em',
                  fontWeight: 600,
                }}
              >
                {formatTraffic(total)}
              </Typography>
              <Typography
                noWrap
                sx={{
                  width: 56,
                  textAlign: 'right',
                  fontSize: '0.75em',
                  color: 'text.secondary',
                }}
              >
                {entry.connections}
              </Typography>
              <Typography
                noWrap
                sx={{
                  width: 52,
                  textAlign: 'right',
                  fontSize: '0.75em',
                  color: 'text.secondary',
                }}
              >
                {share.toFixed(1)}%
              </Typography>
            </Box>
          )
        }}
      />
    </Box>
  )
}
