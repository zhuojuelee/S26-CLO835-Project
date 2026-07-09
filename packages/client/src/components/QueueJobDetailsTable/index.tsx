import { useMemo } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useAtom, useAtomValue } from "jotai";
import type { JobRecord } from "@clo835-project/shared";
import { jobsAtom, jobsPollingEnabledAtom } from "../../atoms/jobsAtom";

type JobRow = {
  redisKey: string;
  job: JobRecord;
};

function getStatusColor(status: JobRecord["status"]) {
  switch (status) {
    case "completed":
      return "success";
    case "failed":
      return "error";
    case "inProgress":
      return "info";
    case "pending":
      return "warning";
    default:
      return "default";
  }
}

export default function QueueJobDetailsTable() {
  const jobsQuery = useAtomValue(jobsAtom);
  const [isPollingEnabled, setIsPollingEnabled] = useAtom(jobsPollingEnabledAtom);
  const rows = useMemo<JobRow[]>(() => {
    return (jobsQuery.data ?? []).flatMap((jobRecord) => {
      return Object.entries(jobRecord).map(([redisKey, job]) => ({
        redisKey,
        job,
      }));
    });
  }, [jobsQuery.data]);

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          alignItems: "center",
          display: "flex",
          gap: 2,
          justifyContent: "space-between",
        }}
      >
        <Typography component="h2" variant="h6">
          Jobs
        </Typography>
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
      </Box>

      {jobsQuery.isError ? (
        <Alert severity="error">
          {jobsQuery.error instanceof Error
            ? jobsQuery.error.message
            : "Failed to fetch jobs"}
        </Alert>
      ) : null}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label="Jobs">
          <TableHead>
            <TableRow>
              <TableCell>Redis Key</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Duration</TableCell>
              <TableCell>Message</TableCell>
              <TableCell>Output</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {jobsQuery.isPending ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Box
                    sx={{
                      alignItems: "center",
                      display: "flex",
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
                <TableCell colSpan={5}>
                  <Typography
                    color="text.secondary"
                    sx={{ py: 2 }}
                    variant="body2"
                  >
                    No jobs
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}

            {rows.map(({ redisKey, job }) => (
              <TableRow hover key={redisKey}>
                <TableCell
                  sx={{
                    fontFamily: "monospace",
                    maxWidth: 240,
                    overflowWrap: "anywhere",
                  }}
                >
                  {redisKey}
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
                <TableCell sx={{ maxWidth: 220, overflowWrap: "anywhere" }}>
                  {job.data.message}
                </TableCell>
                <TableCell sx={{ maxWidth: 360, overflowWrap: "anywhere" }}>
                  {job.results.output || "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
