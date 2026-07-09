import { type FormEventHandler, useCallback, useEffect, useMemo, useState } from 'react';
import SendIcon from '@mui/icons-material/Send';
import { Alert, Button, MenuItem, Paper, Stack, TextField } from '@mui/material';
import type { CreateQueueJobRequest, JobType } from '@clo835-project/shared';

const jobsEndpoint = '/api/jobs';

export default function JobForm() {
  const [jobType, setJobType] = useState<JobType>('queue');
  const [message, setMessage] = useState('Hello from BullMQ');
  const [durationSeconds, setDurationSeconds] = useState('5');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (jobType === 'queue') {
      setMessage('Hello BullMQ Worker');
    } else {
      setMessage('Hello Ephemeral Worker');
    }
  }, [jobType]);

  const createJob = useCallback(async (request: CreateQueueJobRequest) => {
    const response = await fetch(jobsEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to create job: ${response.status}`);
    }
  }, []);

  const canSubmit = useMemo(() => {
    const parsedDurationSeconds = Number(durationSeconds);

    if (isNaN(parsedDurationSeconds)) return false;

    return (
      !isSubmitting &&
      message.trim().length > 0 &&
      Number.isFinite(parsedDurationSeconds) &&
      parsedDurationSeconds > 0
    );
  }, [durationSeconds, isSubmitting, message]);

  const onSubmitClick = useCallback<FormEventHandler<HTMLFormElement>>(
    async (event) => {
      event.preventDefault();

      if (!canSubmit) {
        return;
      }

      try {
        setIsSubmitting(true);
        setErrorMessage(null);
        await createJob({
          durationSeconds: Number(durationSeconds),
          message: message.trim(),
          jobType,
        });
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to queue job');
      } finally {
        setIsSubmitting(false);
      }
    },
    [canSubmit, createJob, durationSeconds, jobType, message],
  );

  return (
    <Stack spacing={2}>
      <Paper component="form" onSubmit={onSubmitClick} sx={{ p: 2 }} variant="outlined">
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
        >
          <TextField
            label="Type"
            name="jobType"
            onChange={(event) => {
              setJobType(event.target.value as JobType);
            }}
            select
            size="small"
            sx={{ minWidth: { sm: 150 } }}
            value={jobType}
          >
            <MenuItem value="queue">Queue</MenuItem>
            <MenuItem value="ephemeral">Ephemeral</MenuItem>
          </TextField>
          <TextField
            fullWidth
            label="Message"
            name="message"
            onChange={(event) => {
              setMessage(event.target.value);
            }}
            size="small"
            value={message}
          />
          <TextField
            inputProps={{ min: 1, max: 300 }}
            label="Duration"
            name="durationSeconds"
            onChange={(event) => {
              setDurationSeconds(event.target.value);
            }}
            size="small"
            sx={{ minWidth: { sm: 140 } }}
            type="number"
            value={durationSeconds}
          />
          <Button
            disabled={!canSubmit}
            loading={isSubmitting}
            startIcon={<SendIcon />}
            sx={{ minWidth: 120 }}
            type="submit"
            variant="contained"
          >
            Start
          </Button>
        </Stack>
      </Paper>

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
    </Stack>
  );
}
