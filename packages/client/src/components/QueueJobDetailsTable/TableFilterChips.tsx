import { useMemo } from 'react';
import { Box, Chip, Stack, type ChipProps } from '@mui/material';
import { useAtom } from 'jotai';
import type { JobRecord } from '@clo835-project/shared';
import {
  jobStatusFilterAtom,
  jobTypeFilterAtom,
  type JobStatusFilter,
  type JobTypeFilter,
} from '../../atoms/jobAtom';

type FilterConfig<TValue extends string> = {
  value: TValue;
  label: string;
  color: ChipProps['color'];
};

type StatusCounts = Record<JobStatusFilter, number>;
type TypeCounts = Record<JobTypeFilter, number>;

const statusFilters: Array<FilterConfig<JobStatusFilter>> = [
  {
    value: 'all',
    label: 'All',
    color: 'primary',
  },
  {
    value: 'pending',
    label: 'Pending',
    color: 'warning',
  },
  {
    value: 'inProgress',
    label: 'In Progress',
    color: 'info',
  },
  {
    value: 'completed',
    label: 'Completed',
    color: 'success',
  },
  {
    value: 'failed',
    label: 'Failed',
    color: 'error',
  },
];

const typeFilters: Array<FilterConfig<JobTypeFilter>> = [
  {
    value: 'all',
    label: 'All Types',
    color: 'default',
  },
  {
    value: 'queue',
    label: 'BullMQ',
    color: 'primary',
  },
  {
    value: 'ephemeral',
    label: 'Ephemeral',
    color: 'secondary',
  },
];

const emptyStatusCounts: StatusCounts = {
  all: 0,
  pending: 0,
  inProgress: 0,
  completed: 0,
  failed: 0,
};

const emptyTypeCounts: TypeCounts = {
  all: 0,
  queue: 0,
  ephemeral: 0,
};

function getJobType(job: JobRecord): JobRecord['jobType'] {
  return job.jobType === 'ephemeral' ? 'ephemeral' : 'queue';
}

export default function TableFilterChips({ jobs }: { jobs: JobRecord[] }) {
  const [selectedStatusFilter, setSelectedStatusFilter] = useAtom(jobStatusFilterAtom);
  const [selectedTypeFilter, setSelectedTypeFilter] = useAtom(jobTypeFilterAtom);

  const { statusCounts, typeCounts } = useMemo(() => {
    return jobs.reduce(
      (counts, job) => {
        const jobType = getJobType(job);
        const { statusCounts, typeCounts } = counts;

        statusCounts.all += 1;
        statusCounts[job.status] += 1;
        typeCounts.all += 1;
        typeCounts[jobType] += 1;

        return counts;
      },
      {
        statusCounts: { ...emptyStatusCounts },
        typeCounts: { ...emptyTypeCounts },
      },
    );
  }, [jobs]);

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        alignItems: 'center',
        flexWrap: 'wrap',
        rowGap: 1,
      }}
    >
      {statusFilters.map((filter) => {
        const isSelected = selectedStatusFilter === filter.value;

        return (
          <Chip
            color={filter.color}
            key={filter.value}
            label={`${filter.label} ${statusCounts[filter.value]}`}
            onClick={() => {
              setSelectedStatusFilter(filter.value);
            }}
            size="small"
            variant={isSelected ? 'filled' : 'outlined'}
          />
        );
      })}
      <Box
        aria-hidden="true"
        sx={{
          alignSelf: 'stretch',
          borderLeft: 1,
          borderColor: 'divider',
          minHeight: 24,
          mx: 0.5,
        }}
      />
      {typeFilters.map((filter) => {
        const isSelected = selectedTypeFilter === filter.value;

        return (
          <Chip
            color={filter.color}
            key={filter.value}
            label={`${filter.label} ${typeCounts[filter.value]}`}
            onClick={() => {
              setSelectedTypeFilter(filter.value);
            }}
            size="small"
            variant={isSelected ? 'filled' : 'outlined'}
          />
        );
      })}
    </Stack>
  );
}
