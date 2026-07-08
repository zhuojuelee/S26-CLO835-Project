import { Container, Stack, Typography } from "@mui/material";

export default function App() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={2}>
        <Typography component="h1" variant="h4">
          CLO835 Async Job Orchestration
        </Typography>
        <Typography color="text.secondary">
          Queue and ephemeral job controls will be added after the API contract is finalized.
        </Typography>
      </Stack>
    </Container>
  );
}
