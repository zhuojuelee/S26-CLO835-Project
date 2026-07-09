import { useCallback, useEffect, useMemo, useState } from 'react';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import {
  Alert,
  Box,
  Button,
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
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import type { DeleteJobsResponse, JobRecord } from '@clo835-project/shared';
import {
  adminSecretAtom,
  adminSessionAtom,
  clearAdminSecretAtom,
  hasAdminPrivilegeAtom,
  setAdminSecretAtom,
} from '../../atoms/adminAtom';
import { jobsAtom, jobsPollingEnabledAtom } from '../../atoms/jobAtom';

const jobsEndpoint = '/api/jobs';

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

export default function QueueJobDetailsTable() {
  const jobsQuery = useAtomValue(jobsAtom);
  const adminSecret = useAtomValue(adminSecretAtom);
  const adminSession = useAtomValue(adminSessionAtom);
  const hasAdminPrivilege = useAtomValue(hasAdminPrivilegeAtom);

  // admin atoms
  const clearAdminSecret = useSetAtom(clearAdminSecretAtom);
  const setAdminSecret = useSetAtom(setAdminSecretAtom);

  const [isPollingEnabled, setIsPollingEnabled] = useAtom(jobsPollingEnabledAtom);
  const [adminSecretInput, setAdminSecretInput] = useState('');
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

  useEffect(() => {
    if (!adminSession) {
      return;
    }

    const expiresInMs = adminSession.expiresAt - Date.now();

    if (expiresInMs <= 0) {
      clearAdminSecret();
      return;
    }

    const timeout = window.setTimeout(() => {
      clearAdminSecret();
    }, expiresInMs);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [adminSession, clearAdminSecret]);

  const unlockAdmin = useCallback(() => {
    setAdminSecret(adminSecretInput);
    setAdminSecretInput('');
  }, [adminSecretInput, setAdminSecret]);

  const clearJobs = useCallback(async () => {
    if (!adminSession) return;

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
        if (response.status === 403) {
          clearAdminSecret();
        }

        throw new Error(`Failed to clear jobs: ${response.status}`);
      }

      (await response.json()) as DeleteJobsResponse;
      await jobsQuery.refetch();
    } catch (error) {
      setClearJobsError(error instanceof Error ? error.message : 'Failed to clear jobs');
    } finally {
      setIsClearingJobs(false);
    }
  }, [adminSecret, clearAdminSecret, jobsQuery]);

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
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <TextField
            label={hasAdminPrivilege ? 'Admin active' : 'Admin secret'}
            onChange={(event) => {
              setAdminSecretInput(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                unlockAdmin();
              }
            }}
            size="small"
            sx={{ width: 180 }}
            type="password"
            value={adminSecretInput}
          />
          <Button
            disabled={!adminSecretInput.trim()}
            onClick={unlockAdmin}
            size="small"
            startIcon={<LockOpenIcon />}
            variant="outlined"
          >
            Unlock
          </Button>
          <Tooltip title={hasAdminPrivilege ? 'Clear Redis job records' : 'Admin secret required'}>
            <span>
              <IconButton
                aria-label="Clear Redis job records"
                color="error"
                disabled={!hasAdminPrivilege || isClearingJobs || rows.length === 0}
                onClick={clearJobs}
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

      {jobsQuery.isError ? (
        <Alert severity="error">
          {jobsQuery.error instanceof Error ? jobsQuery.error.message : 'Failed to fetch jobs'}
        </Alert>
      ) : null}

      {clearJobsError ? <Alert severity="error">{clearJobsError}</Alert> : null}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label="Jobs">
          <TableHead>
            <TableRow>
              <TableCell>Redis Key</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Duration</TableCell>
              <TableCell>Message</TableCell>
              <TableCell>Output</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {jobsQuery.isPending ? (
              <TableRow>
                <TableCell colSpan={6}>
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
                <TableCell colSpan={6}>
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
                  <Chip color={getStatusColor(job.status)} label={job.status} size="small" variant="outlined" />
                </TableCell>
                <TableCell align="right">{job.data.durationSeconds}s</TableCell>
                <TableCell sx={{ maxWidth: 220, overflowWrap: 'anywhere' }}>{job.data.message}</TableCell>
                <TableCell sx={{ maxWidth: 360, overflowWrap: 'anywhere' }}>{job.results.output || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
