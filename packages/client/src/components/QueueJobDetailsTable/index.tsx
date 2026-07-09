import { useCallback, useMemo, useState } from 'react';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  FormControlLabel,
  IconButton,
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
import { jobsAtom, jobsPollingEnabledAtom } from '../../atoms/jobAtom';
import ClearCacheConfirmationModal from '../ClearCacheConfirmationModal';

const jobsEndpoint = '/api/jobs';
const emptyValue = '-';

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

function formatTimestamp(timestamp: number | undefined): string {
  if (!timestamp) {
    return emptyValue;
  }

  return new Date(timestamp).toLocaleString();
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
  const jobsQuery = useAtomValue(jobsAtom);
  const [isPollingEnabled, setIsPollingEnabled] = useAtom(jobsPollingEnabledAtom);
  const [isClearJobsModalOpen, setIsClearJobsModalOpen] = useState(false);
  const [isClearingJobs, setIsClearingJobs] = useState(false);
  const [clearJobsError, setClearJobsError] = useState<string | null>(null);

  const rows = useMemo<JobRow[]>(() => {
    return (jobsQuery.data ?? []).flatMap((jobRecord) => {
      return Object.entries(jobRecord).map(([redisKey, job]) => ({
        redisKey,
        job,
      }));
    });
  }, [jobsQuery.data]);

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
        await jobsQuery.refetch();
        return true;
      } catch (error) {
        setClearJobsError(error instanceof Error ? error.message : 'Failed to clear jobs');
        return false;
      } finally {
        setIsClearingJobs(false);
      }
    },
    [jobsQuery],
  );

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          alignItems: 'center',
          display: 'flex',
          gap: 2,
          justifyContent: 'space-between',
        }}
      >
        <Typography component="h2" variant="h6">
          Jobs
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}
        >
          <Tooltip title={rows.length === 0 ? 'No jobs to clear' : 'Clear Redis job records'}>
            <span>
              <IconButton
                aria-label="Clear Redis job records"
                color="error"
                disabled={isClearingJobs || rows.length === 0}
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

      {jobsQuery.isError ? (
        <Alert severity="error">
          {jobsQuery.error instanceof Error ? jobsQuery.error.message : 'Failed to fetch jobs'}
        </Alert>
      ) : null}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label="Jobs">
          <TableHead>
            <TableRow>
              <TableCell>Redis Key</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Duration</TableCell>
              <TableCell align="right">Retries</TableCell>
              <TableCell>Timing</TableCell>
              <TableCell>Message</TableCell>
              <TableCell>Output</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {jobsQuery.isPending ? (
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

            {!jobsQuery.isPending && rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography color="text.secondary" sx={{ py: 2 }} variant="body2">
                    No jobs
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}

            {rows.map(({ redisKey, job }) => (
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
                <TableCell align="right">{job.data.durationSeconds}s</TableCell>
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
