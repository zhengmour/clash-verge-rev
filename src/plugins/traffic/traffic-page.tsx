import { BarChartRounded, DeleteSweepRounded } from '@mui/icons-material'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  MenuItem,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { BasePage, BaseSearchBox, BaseStyledSelect } from '@/components/base'

import {
  collectDailyTotals,
  collectRankedEntries,
  collectTotals,
  recentDayKeys,
  resolveEntryLabel,
  toDayKey,
  totalOf,
} from './aggregate'
import { clearTrafficStats, startTrafficCollector } from './collector'
import { TrafficDailyChart } from './traffic-daily-chart'
import { TrafficRankList } from './traffic-rank-list'
import { TrafficSummary } from './traffic-summary'
import { trafficDimensions, type TrafficDimension } from './types'
import { useTrafficSnapshot } from './use-traffic-snapshot'

type TrafficRange = 'today' | 'week' | 'month'

const RANGE_DAYS: Record<TrafficRange, number> = {
  today: 1,
  week: 7,
  month: 30,
}

const RANGES: TrafficRange[] = ['today', 'week', 'month']

const TrafficPage = () => {
  const { t } = useTranslation()
  const snapshot = useTrafficSnapshot()
  const [dimension, setDimension] = useState<TrafficDimension>('process')
  const [range, setRange] = useState<TrafficRange>('today')
  const [match, setMatch] = useState(() => (_: string) => true)
  const [clearOpen, setClearOpen] = useState(false)

  useEffect(() => {
    startTrafficCollector()
  }, [])

  const todayKey = toDayKey()
  const dayKeys = useMemo(() => recentDayKeys(RANGE_DAYS[range]), [range])

  const entries = useMemo(
    () => collectRankedEntries(snapshot.store, dimension, dayKeys),
    [snapshot, dimension, dayKeys],
  )

  const filtered = useMemo(
    () => entries.filter((entry) => match(resolveEntryLabel(entry.key, t))),
    [entries, match, t],
  )

  const today = useMemo(
    () => collectTotals(snapshot.store, [todayKey]),
    [snapshot, todayKey],
  )
  const week = useMemo(
    () => collectTotals(snapshot.store, recentDayKeys(7)),
    [snapshot],
  )
  const month = useMemo(
    () => collectTotals(snapshot.store, recentDayKeys(30)),
    [snapshot],
  )
  const daily = useMemo(
    () => collectDailyTotals(snapshot.store, recentDayKeys(30)),
    [snapshot],
  )

  const handleRangeChange = (value: string) => {
    setRange(value as TrafficRange)
  }

  const handleClear = () => {
    clearTrafficStats()
    setClearOpen(false)
  }

  return (
    <BasePage
      full
      title={t('traffic.page.title')}
      contentStyle={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      header={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BaseStyledSelect
            value={range}
            onChange={(e) => handleRangeChange(e.target.value)}
          >
            {RANGES.map((item) => (
              <MenuItem key={item} value={item}>
                {t(`traffic.range.${item}`)}
              </MenuItem>
            ))}
          </BaseStyledSelect>
          <Tooltip title={t('traffic.actions.clear')}>
            <IconButton
              size="small"
              aria-label={t('traffic.actions.clear')}
              onClick={() => setClearOpen(true)}
            >
              <DeleteSweepRounded fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      }
    >
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          pt: 1,
          px: '10px',
          overflow: 'hidden',
        }}
      >
        <TrafficSummary
          today={today}
          week={week}
          month={month}
          session={snapshot.session}
        />

        <TrafficDailyChart data={daily} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tabs
            value={dimension}
            onChange={(_, value: TrafficDimension) => setDimension(value)}
            sx={{
              minHeight: 34,
              '& .MuiTab-root': {
                minHeight: 34,
                py: 0.25,
                fontSize: '0.8em',
                textTransform: 'none',
              },
            }}
          >
            {trafficDimensions.map((item) => (
              <Tab
                key={item}
                value={item}
                label={t(`traffic.dimension.${item}`)}
              />
            ))}
          </Tabs>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <BaseSearchBox onSearch={(next) => setMatch(() => next)} />
          </Box>
        </Box>

        {filtered.length > 0 ? (
          <TrafficRankList
            entries={filtered}
            total={entries.reduce((sum, entry) => sum + totalOf(entry), 0)}
            peak={entries.length > 0 ? totalOf(entries[0]) : 0}
          />
        ) : (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              color: 'text.secondary',
            }}
          >
            <BarChartRounded sx={{ fontSize: '3em', opacity: 0.4 }} />
            <Typography sx={{ fontSize: '1.1em' }}>
              {t('traffic.empty.title')}
            </Typography>
            <Typography
              variant="caption"
              sx={{ maxWidth: 460, textAlign: 'center' }}
            >
              {t('traffic.empty.description')}
            </Typography>
            {dimension === 'process' ? (
              <Typography
                variant="caption"
                sx={{ maxWidth: 460, textAlign: 'center', opacity: 0.8 }}
              >
                {t('traffic.empty.processHint')}
              </Typography>
            ) : null}
          </Box>
        )}
      </Box>

      <Dialog open={clearOpen} onClose={() => setClearOpen(false)}>
        <DialogTitle>{t('traffic.actions.clearTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('traffic.actions.clearDescription')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearOpen(false)}>
            {t('shared.actions.cancel')}
          </Button>
          <Button color="error" onClick={handleClear}>
            {t('traffic.actions.clearConfirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </BasePage>
  )
}

export default TrafficPage
