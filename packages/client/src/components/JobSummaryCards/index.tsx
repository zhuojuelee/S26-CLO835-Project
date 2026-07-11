import { useMemo } from 'react';
import { alpha, Box, Paper, Stack, Typography, type PaletteColor, type Theme } from '@mui/material';
import { useAtomValue } from 'jotai';
import type { JobRecord } from '@clo835-project/shared';
import { jobsAtom } from '../../atoms/jobAtom';

type SummaryColor = 'primary' | 'warning' | 'info' | 'success' | 'error';

type JobTypeCounts = {
  total: number;
  queue: number;
  ephemeral: number;
};

type JobSummary = {
  total: JobTypeCounts;
  pending: JobTypeCounts;
  inProgress: JobTypeCounts;
  completed: JobTypeCounts;
  failed: JobTypeCounts;
};

type SummaryCard = {
  label: string;
  counts: JobTypeCounts;
  color: SummaryColor;
};

const emptyJobTypeCounts: JobTypeCounts = {
  total: 0,
  queue: 0,
  ephemeral: 0,
};

function getPaletteColor(theme: Theme, color: SummaryColor): PaletteColor {
  return theme.palette[color];
}

function createEmptySummary(): JobSummary {
  return {
    total: { ...emptyJobTypeCounts },
    pending: { ...emptyJobTypeCounts },
    inProgress: { ...emptyJobTypeCounts },
    completed: { ...emptyJobTypeCounts },
    failed: { ...emptyJobTypeCounts },
  };
}

function incrementCounts(counts: JobTypeCounts, job: JobRecord) {
  const jobType = job.jobType === 'ephemeral' ? 'ephemeral' : 'queue';

  counts.total += 1;
  counts[jobType] += 1;
}

function createSummary(jobs: JobRecord[]): JobSummary {
  return jobs.reduce<JobSummary>(
    (summary, job) => {
      incrementCounts(summary.total, job);
      incrementCounts(summary[job.status], job);

      return summary;
    },
    createEmptySummary(),
  );
}

export default function JobSummaryCards() {
  const jobsQuery = useAtomValue(jobsAtom);

  const summary = useMemo(() => {
    const jobs = (jobsQuery.data ?? []).flatMap((jobRecord) => Object.values(jobRecord));

    return createSummary(jobs);
  }, [jobsQuery.data]);

  const cards: SummaryCard[] = [
    {
      label: 'Total Jobs',
      counts: summary.total,
      color: 'primary',
    },
    {
      label: 'Pending',
      counts: summary.pending,
      color: 'warning',
    },
    {
      label: 'In Progress',
      counts: summary.inProgress,
      color: 'info',
    },
    {
      label: 'Completed',
      counts: summary.completed,
      color: 'success',
    },
    {
      label: 'Failed',
      counts: summary.failed,
      color: 'error',
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, minmax(0, 1fr))',
          md: 'repeat(5, minmax(0, 1fr))',
        },
      }}
    >
      {cards.map((card) => (
        <Paper
          key={card.label}
          sx={(theme) => {
            const paletteColor = getPaletteColor(theme, card.color);

            return {
              backgroundColor: alpha(paletteColor.main, 0.08),
              borderColor: alpha(paletteColor.main, 0.35),
              borderLeft: `4px solid ${paletteColor.main}`,
              minHeight: 116,
              p: 2,
            };
          }}
          variant="outlined"
        >
          <Stack spacing={1.5}>
            <Typography color="text.secondary" variant="body2">
              {card.label}
            </Typography>
            <Stack
              direction="row"
              spacing={2}
              sx={{
                alignItems: 'flex-end',
                justifyContent: 'space-between',
              }}
            >
              <Typography component="div" sx={{ fontWeight: 700, lineHeight: 1 }} variant="h4">
                {card.counts.total}
              </Typography>
              <Stack spacing={0.5} sx={{ minWidth: 104 }}>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
                  <Typography color="text.secondary" variant="caption">
                    BullMQ
                  </Typography>
                  <Typography sx={{ fontWeight: 700 }} variant="caption">
                    {card.counts.queue}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
                  <Typography color="text.secondary" variant="caption">
                    Ephemeral
                  </Typography>
                  <Typography sx={{ fontWeight: 700 }} variant="caption">
                    {card.counts.ephemeral}
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </Stack>
        </Paper>
      ))}
    </Box>
  );
}
