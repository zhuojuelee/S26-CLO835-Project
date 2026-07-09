import { type FormEvent, useCallback, useMemo, useState } from "react";
import SendIcon from "@mui/icons-material/Send";
import { Alert, Button, Paper, Stack, TextField } from "@mui/material";
import type { CreateQueueJobRequest } from "@clo835-project/shared";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export default function JobForm() {
  const [message, setMessage] = useState("Hello from BullMQ");
  const [durationSeconds, setDurationSeconds] = useState("5");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createJob = useCallback(async (request: CreateQueueJobRequest) => {
    const response = await fetch(`${apiBaseUrl}/jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
  }, [durationSeconds]);

  const onSubmitClick = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
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
        });
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to queue job",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [durationSeconds, message],
  );

  return (
    <Stack spacing={2}>
      <Paper
        component="form"
        onSubmit={onSubmitClick}
        sx={{ p: 2 }}
        variant="outlined"
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ alignItems: { xs: "stretch", sm: "center" } }}
        >
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
            Queue Job
          </Button>
        </Stack>
      </Paper>

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
    </Stack>
  );
}
