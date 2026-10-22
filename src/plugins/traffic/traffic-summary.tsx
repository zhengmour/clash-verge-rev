import { Box, Typography, alpha } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { formatTraffic, totalOf } from './aggregate'
import type { TrafficAmount, TrafficSession } from './types'

interface SummaryCardProps {
  label: string
  amount: TrafficAmount
  hint?: string
}

const SummaryCard = ({ label, amount, hint }: SummaryCardProps) => (
  <Box
    sx={(theme) => ({
      px: 1.5,
      py: 1.25,
      minWidth: 0,
      borderRadius: 2,
      border: '1px solid',
      borderColor: 'divider',
      bgcolor: alpha(
        theme.palette.primary.main,
        theme.palette.mode === 'light' ? 0.04 : 0.1,
      ),
    })}
  >
    <Typography variant="caption" color="text.secondary" noWrap>
      {label}
    </Typography>
    <Typography
      sx={{ fontSize: '1.35em', fontWeight: 700, lineHeight: 1.35 }}
      noWrap
    >
      {formatTraffic(totalOf(amount))}
    </Typography>
    <Typography variant="caption" color="text.secondary" noWrap component="div">
      ↑ {formatTraffic(amount.upload)} · ↓ {formatTraffic(amount.download)}
    </Typography>
    {hint ? (
      <Typography
        variant="caption"
        color="text.secondary"
        noWrap
        component="div"
        sx={{ opacity: 0.8 }}
      >
        {hint}
      </Typography>
    ) : null}
  </Box>
)

interface TrafficSummaryProps {
  today: TrafficAmount
  week: TrafficAmount
  month: TrafficAmount
  session: TrafficSession
}

export const TrafficSummary = ({
  today,
  week,
  month,
  session,
}: TrafficSummaryProps) => {
  const { t } = useTranslation()

  const sessionAmount: TrafficAmount = {
    upload: session.upload,
    download: session.download,
  }

  const hint = session.online
    ? t('traffic.status.active', { count: session.activeConnections })
    : t('traffic.status.offline')

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: 1.5,
      }}
    >
      <SummaryCard label={t('traffic.summary.today')} amount={today} />
      <SummaryCard label={t('traffic.summary.week')} amount={week} />
      <SummaryCard label={t('traffic.summary.month')} amount={month} />
      <SummaryCard
        label={t('traffic.summary.session')}
        amount={sessionAmount}
        hint={hint}
      />
    </Box>
  )
}
