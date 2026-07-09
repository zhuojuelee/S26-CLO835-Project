import { Container, Stack, Typography } from '@mui/material';
import JobForm from './components/JobForm';
import QueueJobDetailsTable from './components/QueueJobDetailsTable';

export default function App() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Typography component="h1" variant="h4">
          CLO835 Async Job Orchestration
        </Typography>

        <JobForm />
        <QueueJobDetailsTable />
      </Stack>
    </Container>
  );
}
