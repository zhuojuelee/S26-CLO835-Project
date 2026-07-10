import { Box, Container, Stack, SvgIcon, Typography } from '@mui/material';
import JobForm from './components/JobForm';
import QueueJobDetailsTable from './components/QueueJobDetailsTable';
import logo from './assets/logo.svg';

export default function App() {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Stack direction="row" spacing={4}>
          <SvgIcon
            viewBox="0 0 32 32"
            sx={{
              shapeRendering: 'crispEdges',
              height: 80,
              width: 80,
            }}
          >
            <path
              fill="#326CE5"
              d="M15 2h2v4h-2z M11 5h10v2h-10z M8 7h4v2h-4z M20 7h4v2h-4z M6 9h3v2h-3z M23 9h3v2h-3z M5 11h2v10h-2z M25 11h2v10h-2z M6 21h3v2h-3z M23 21h3v2h-3z M8 23h4v2h-4z M20 23h4v2h-4z M11 25h10v2h-10z M15 26h2v4h-2z M12 9h2v2h-2z M18 9h2v2h-2z M9 15h2v2h-2z M21 15h2v2h-2z M12 21h2v2h-2z M18 21h2v2h-2z"
            />
            <path
              fill="#2496ED"
              d="M11 16h11v4h-11z M12 15h9v1h-9z M10 17h13v2h-13z M8 14h2v2h-2z M9 16h1v1h-1z"
            />
            <path fill="#ffffff'" opacity="0.7" d="M20 16h1v1h-1z" />
            <path
              fill="#7fbaec"
              d="M13 13h2v1h-2z M16 13h2v1h-2z M19 13h2v1h-2z M14 11h2v1h-2z M17 11h2v1h-2z"
            />
          </SvgIcon>
          <Stack>
            <Typography component="h1" variant="h4">
              Async Job Creator
            </Typography>
            <Typography variant="h6">CLO835 Project Demo Dashboard</Typography>
          </Stack>
        </Stack>
        <JobForm />
        <QueueJobDetailsTable />
      </Stack>
    </Container>
  );
}
