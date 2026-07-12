import { useCallback, useMemo, useState } from 'react';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import { keyframes } from '@emotion/react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  FormControlLabel,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { useAtom, useAtomValue } from 'jotai';
import type { DeleteJobsResponse, JobRecord } from '@clo835-project/shared';
import {
  jobsAtom,
  jobsPollingEnabledAtom,
  jobStatusFilterAtom,
  jobTypeFilterAtom,
} from '../../atoms/jobAtom';
import ClearCacheConfirmationModal from '../ClearCacheConfirmationModal';
import TableFilterChips from './TableFilterChips';

const jobsEndpoint = '/api/jobs';
const emptyValue = '-';
const millisecondsPerSecond = 1000;
const livePollingPulse = keyframes`
  0%, 100% {
    opacity: 0.35;
    transform: scale(0.75);
  }

  50% {
    opacity: 1;
    transform: scale(1);
  }
`;

type JobRow = {
  redisKey: string;
  job: JobRecord;
};

function getStatusColor(status: JobRecord['status']) {
  switch (status) {
    case 'completed':
      return 'success';
    case 'failed':
      return 'error';
    case 'inProgress':
      return 'info';
    case 'pending':
      return 'warning';
    default:
      return 'default';
  }
}

function getJobTypeColor(jobType: JobRecord['jobType'] | undefined) {
  switch (jobType) {
    case 'ephemeral':
      return 'secondary';
    case 'queue':
    default:
      return 'primary';
  }
}

function getProgressColor(status: JobRecord['status']) {
  switch (status) {
    case 'completed':
      return 'success';
    case 'failed':
      return 'error';
    case 'inProgress':
      return 'info';
    case 'pending':
    default:
      return 'warning';
  }
}

function formatTimestamp(timestamp: number | undefined): string {
  if (!timestamp) {
    return emptyValue;
  }

  return new Date(timestamp).toLocaleString();
}

function getElapsedMilliseconds(job: JobRecord): number {
  if (!job.startedAt) {
    return 0;
  }

  const endTimestamp = job.endedAt ?? Date.now();

  return Math.max(0, endTimestamp - job.startedAt);
}

function getProgressPercent(job: JobRecord): number {
  if (job.status === 'completed') {
    return 100;
  }

  const durationMilliseconds = Math.max(1, job.data.durationSeconds) * millisecondsPerSecond;
  const elapsedMilliseconds = getElapsedMilliseconds(job);

  return Math.min(100, Math.round((elapsedMilliseconds / durationMilliseconds) * 100));
}

function getTimingRows(job: JobRecord): Array<[string, string]> {
  return [
    ['Created', formatTimestamp(job.createdAt)],
    ['Updated', formatTimestamp(job.updatedAt)],
    ['Started', formatTimestamp(job.startedAt)],
    ['Ended', formatTimestamp(job.endedAt)],
  ];
}

export default function QueueJobDetailsTable() {
  const { data: jobs, refetch, isFetching, isError, error, isPending } = useAtomValue(jobsAtom);
  const jobStatusFilter = useAtomValue(jobStatusFilterAtom);
  const jobTypeFilter = useAtomValue(jobTypeFilterAtom);
  const [isPollingEnabled, setIsPollingEnabled] = useAtom(jobsPollingEnabledAtom);
  const [isClearJobsModalOpen, setIsClearJobsModalOpen] = useState(false);
  const [isClearingJobs, setIsClearingJobs] = useState(false);
  const [clearJobsError, setClearJobsError] = useState<string | null>(null);

  const allRows = useMemo<JobRow[]>(() => {
    return (jobs ?? []).flatMap((jobRecord) => {
      return Object.entries(jobRecord).map(([redisKey, job]) => ({
        redisKey,
        job,
      }));
    });
  }, [jobs]);

  const filteredRows = useMemo(() => {
    return allRows.filter(({ job }) => {
      const jobType = job.jobType === 'ephemeral' ? 'ephemeral' : 'queue';
      const matchesStatus = jobStatusFilter === 'all' || job.status === jobStatusFilter;
      const matchesType = jobTypeFilter === 'all' || jobType === jobTypeFilter;

      return matchesStatus && matchesType;
    });
  }, [allRows, jobStatusFilter, jobTypeFilter]);

  const allJobs = useMemo(() => allRows.map(({ job }) => job), [allRows]);

  const clearJobs = useCallback(
    async (adminSecret: string) => {
      try {
        setIsClearingJobs(true);
        setClearJobsError(null);

        const response = await fetch(jobsEndpoint, {
          method: 'DELETE',
          headers: {
            'x-admin-secret': adminSecret,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to clear jobs: ${response.status}`);
        }

        (await response.json()) as DeleteJobsResponse;
        await refetch();
        return true;
      } catch (error) {
        setClearJobsError(error instanceof Error ? error.message : 'Failed to clear jobs');
        return false;
      } finally {
        setIsClearingJobs(false);
      }
    },
    [refetch],
  );

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          alignItems: { xs: 'stretch', md: 'center' },
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
          justifyContent: 'space-between',
        }}
      >
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            alignItems: 'center',
            flexWrap: 'wrap',
            rowGap: 1,
          }}
        >
          <Typography component="h2" variant="h6">
            Jobs
          </Typography>
          <TableFilterChips jobs={allJobs} />
        </Stack>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}
        >
          <Tooltip title={allRows.length === 0 ? 'No jobs to clear' : 'Clear Redis job records'}>
            <span>
              <IconButton
                aria-label="Clear Redis job records"
                color="error"
                disabled={isClearingJobs || allRows.length === 0}
                onClick={() => {
                  setClearJobsError(null);
                  setIsClearJobsModalOpen(true);
                }}
                size="small"
              >
                {isClearingJobs ? <CircularProgress color="inherit" size={18} /> : <DeleteOutlineIcon />}
              </IconButton>
            </span>
          </Tooltip>
          <FormControlLabel
            control={
              <Switch
                checked={isPollingEnabled}
                onChange={(event) => {
                  setIsPollingEnabled(event.target.checked);
                }}
                size="small"
              />
            }
            label="Live polling"
          />
          <Box
            sx={{
              alignItems: 'center',
              display: 'inline-flex',
              flex: '0 0 34px',
              height: 34,
              justifyContent: 'center',
              width: 34,
            }}
          >
            {isPollingEnabled ? (
              <Tooltip title="Live polling active">
                <Box
                  aria-label="Live polling active"
                  component="span"
                  role="status"
                  sx={{
                    animation: `${livePollingPulse} 1.2s ease-in-out infinite`,
                    bgcolor: 'error.main',
                    borderRadius: '50%',
                    boxShadow: (theme) => `0 0 0 4px ${theme.palette.error.main}1f`,
                    display: 'inline-block',
                    height: 10,
                    width: 10,
                  }}
                />
              </Tooltip>
            ) : (
              <Tooltip title="Refresh jobs">
                <span>
                  <IconButton
                    aria-label="Refresh jobs"
                    disabled={isFetching}
                    onClick={() => {
                      void refetch();
                    }}
                    size="small"
                  >
                    {isFetching ? <CircularProgress color="inherit" size={18} /> : <RefreshIcon />}
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Box>
        </Stack>
      </Box>

      <ClearCacheConfirmationModal
        error={clearJobsError}
        isSubmitting={isClearingJobs}
        onClose={() => {
          if (!isClearingJobs) {
            setIsClearJobsModalOpen(false);
            setClearJobsError(null);
          }
        }}
        onConfirm={clearJobs}
        open={isClearJobsModalOpen}
      />

      {isError ? (
        <Alert severity="error">{error instanceof Error ? error.message : 'Failed to fetch jobs'}</Alert>
      ) : null}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label="Jobs">
          <TableHead>
            <TableRow>
              <TableCell>Redis Key</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Progress</TableCell>
              <TableCell align="right">Retries</TableCell>
              <TableCell>Timing</TableCell>
              <TableCell>Message</TableCell>
              <TableCell>Output</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <Box
                    sx={{
                      alignItems: 'center',
                      display: 'flex',
                      gap: 1.5,
                      py: 2,
                    }}
                  >
                    <CircularProgress size={20} />
                    <Typography color="text.secondary" variant="body2">
                      Loading jobs
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : null}

            {!isPending && allRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography color="text.secondary" sx={{ py: 2 }} variant="body2">
                    No jobs
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}

            {!isPending && allRows.length > 0 && filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography color="text.secondary" sx={{ py: 2 }} variant="body2">
                    No jobs match this filter
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}

            {filteredRows.map(({ redisKey, job }) => (
              <TableRow hover key={redisKey}>
                <TableCell
                  sx={{
                    fontFamily: 'monospace',
                    maxWidth: 240,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {redisKey}
                </TableCell>
                <TableCell>
                  <Chip color={getJobTypeColor(job.jobType)} label={job.jobType ?? 'queue'} size="small" />
                </TableCell>
                <TableCell>
                  <Chip
                    color={getStatusColor(job.status)}
                    label={job.status}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell sx={{ minWidth: 144 }}>
                  <Stack spacing={0.75}>
                    <Box
                      sx={{
                        alignItems: 'baseline',
                        display: 'flex',
                        gap: 1,
                        justifyContent: 'space-between',
                      }}
                    >
                      <Typography sx={{ fontWeight: 700 }} variant="body2">
                        {job.data.durationSeconds}s
                      </Typography>
                      <Typography color="text.secondary" variant="caption">
                        {getProgressPercent(job)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      color={getProgressColor(job.status)}
                      sx={{ borderRadius: 1, height: 6 }}
                      value={getProgressPercent(job)}
                      variant="determinate"
                    />
                  </Stack>
                </TableCell>
                <TableCell align="right">
                  {job.retries}/{job.maxRetries}
                </TableCell>
                <TableCell sx={{ minWidth: 220 }}>
                  <Stack spacing={0.25}>
                    {getTimingRows(job).map(([label, value]) => (
                      <Typography color="text.secondary" component="div" key={label} variant="caption">
                        <Box
                          component="span"
                          sx={{ color: 'text.primary', display: 'inline-block', minWidth: 52 }}
                        >
                          {label}
                        </Box>
                        {value}
                      </Typography>
                    ))}
                  </Stack>
                </TableCell>
                <TableCell sx={{ maxWidth: 220, overflowWrap: 'anywhere' }}>{job.data.message}</TableCell>
                <TableCell sx={{ maxWidth: 360, overflowWrap: 'anywhere' }}>
                  {job.results.output || emptyValue}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
