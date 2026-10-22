import { Box, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { formatTraffic } from './aggregate'

interface DailyTotal {
  dayKey: string
  upload: number
  download: number
}

interface TrafficDailyChartProps {
  data: DailyTotal[]
}

export const TrafficDailyChart = ({ data }: TrafficDailyChartProps) => {
  const { t } = useTranslation()

  const max = data.reduce(
    (peak, item) => Math.max(peak, item.upload + item.download),
    0,
  )

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 0.5,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {t('traffic.chart.title')}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {data.length > 0
            ? `${data[0].dayKey.slice(5)} ~ ${data[data.length - 1].dayKey.slice(5)}`
            : ''}
        </Typography>
      </Box>
      <Box
        sx={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: 56 }}
      >
        {data.map((item) => {
          const total = item.upload + item.download
          const height = max > 0 ? Math.max((total / max) * 100, 2) : 2
          const uploadShare = total > 0 ? item.upload / total : 0

          return (
            <Box
              key={item.dayKey}
              title={`${item.dayKey}  ↑${formatTraffic(item.upload)}  ↓${formatTraffic(item.download)}`}
              sx={{
                flex: 1,
                height: '100%',
                display: 'flex',
                alignItems: 'flex-end',
                borderRadius: 0.5,
                bgcolor: 'action.hover',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  height: `${height}%`,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Box
                  sx={{
                    flexGrow: Math.max(uploadShare, 0.02),
                    bgcolor: 'warning.main',
                  }}
                />
                <Box
                  sx={{
                    flexGrow: Math.max(1 - uploadShare, 0.02),
                    bgcolor: 'primary.main',
                  }}
                />
              </Box>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
