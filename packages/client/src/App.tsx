import { Button, Chip, Container, Stack, SvgIcon, Typography } from '@mui/material';
import JobForm from './components/JobForm';
import QueueJobDetailsTable from './components/QueueJobDetailsTable';
import ArchitectureModal from './components/ArchitectureModal';
import JobSummaryCards from './components/JobSummaryCards';
import ArchitectureIcon from '@mui/icons-material/Architecture';
import { useCallback, useState } from 'react';

const EC2_PUBLIC_IP = import.meta.env.EC2_PUBLIC_IP;

export default function App() {
  const [archModalOpen, setArchModalOpen] = useState(false);

  const onArchModalClose = useCallback(() => {
    setArchModalOpen(false);
  }, []);

  const onGitHubChipClick = useCallback(() => {
    window.open(
      'https://github.com/zhuojuelee/S26-CLO835-Assignment2/tree/master',
      '_blank',
      'noopener,noreferrer',
    );
  }, []);

  const onK8DashboardChipClick = useCallback(() => {
    if (window.location.protocol === 'http:') {
      if (EC2_PUBLIC_IP) {
        window.open(`https://${EC2_PUBLIC_IP}:30081`, '_blank', 'noopener,noreferrer');
        return;
      }
      alert(
        'This is currently running on a HTTP protocol, so the dashboard would not work. Please use the public IP to access it at https://<public-ip>/dashboard.',
      );
      return;
    }

    window.open(`${window.location.href}dashboard`, '_blank', 'noopener,noreferrer');
  }, []);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <ArchitectureModal open={archModalOpen} onClose={onArchModalClose} />
      <Stack spacing={3}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack direction="row" spacing={4} sx={{ alignItems: 'center' }}>
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
              <Typography component="h1" variant="h5" fontWeight="bold">
                Async Job/Worker Orchestration with KEDA and Native K8 APIs
              </Typography>
              <Typography variant="h6">CLO835 Project Demo Dashboard</Typography>
            </Stack>
          </Stack>
          <Stack direction="row" spacing={2}>
            <Chip
              clickable
              onClick={() => setArchModalOpen(true)}
              label="Architecture"
              icon={<ArchitectureIcon color="action" />}
            />
            <Chip
              clickable
              onClick={onK8DashboardChipClick}
              label="K8 Dashboard"
              icon={
                <SvgIcon>
                  <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="none">
                    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                    <g id="SVGRepo_iconCarrier">
                      <path
                        fill="#326DE6"
                        d="M4.5 14.569c.214.278.539.431.874.431h5.251c.335 0 .66-.165.875-.434l3.258-4.178c.214-.278.288-.633.214-.978l-1.165-5.207a1.128 1.128 0 00-.606-.777l-4.714-2.31A1.062 1.062 0 008.002 1c-.168 0-.335.038-.485.115l-4.715 2.32a1.129 1.129 0 00-.605.777L1.032 9.42c-.084.345 0 .7.214.978L4.5 14.568z"
                      ></path>
                      <path
                        fill="#ffffff"
                        fill-rule="evenodd"
                        d="M12.741 9.128c.098.002.196.01.293.024l.058.013.031.008a.308.308 0 01.26.371.306.306 0 01-.396.223h-.004l-.003-.001-.003-.002a1.58 1.58 0 00-.03-.006l-.05-.01a2.55 2.55 0 01-.274-.106 2.867 2.867 0 00-.533-.157.242.242 0 00-.171.064 4.656 4.656 0 00-.131-.023 3.971 3.971 0 01-1.764 2.212c.015.042.032.083.051.123a.239.239 0 00-.023.18c.074.17.165.332.271.484.06.078.114.16.164.244l.028.057.012.025a.306.306 0 01-.381.44.308.308 0 01-.172-.18l-.01-.02a1.57 1.57 0 01-.028-.058 2.546 2.546 0 01-.089-.28 2.837 2.837 0 00-.21-.512.242.242 0 00-.156-.095l-.03-.053-.035-.064a3.97 3.97 0 01-2.823-.007l-.07.125a.25.25 0 00-.132.064 2.13 2.13 0 00-.237.548 2.518 2.518 0 01-.088.28 1.196 1.196 0 01-.025.05l-.013.027v.001a.306.306 0 01-.421.173.308.308 0 01-.173-.314.306.306 0 01.041-.12l.014-.03.026-.052c.05-.085.104-.166.164-.244.108-.156.2-.322.277-.496a.302.302 0 00-.028-.173l.056-.133A3.972 3.972 0 014.22 9.532l-.134.023a.34.34 0 00-.176-.062 2.871 2.871 0 00-.533.156c-.09.04-.181.075-.274.105a1.017 1.017 0 01-.05.011l-.03.007H3.02l-.002.002h-.005a.308.308 0 01-.397-.349.306.306 0 01.261-.245l.005-.001h.002l.006-.002c.024-.006.054-.014.076-.018.097-.013.195-.021.293-.023.186-.013.37-.043.549-.09a.422.422 0 00.131-.133l.128-.037a3.938 3.938 0 01.625-2.752l-.098-.087a.338.338 0 00-.062-.176 2.854 2.854 0 00-.455-.319 2.557 2.557 0 01-.254-.148l-.048-.038-.015-.013-.004-.003a.323.323 0 01-.076-.45.295.295 0 01.244-.107.365.365 0 01.213.08l.022.017c.016.013.034.026.046.037.072.067.139.139.202.213.125.137.263.262.412.372.056.03.121.036.182.018l.11.078a3.938 3.938 0 012.552-1.224l.008-.129a.332.332 0 00.099-.158 2.844 2.844 0 00-.034-.553 2.56 2.56 0 01-.042-.29v-.082-.005A.306.306 0 018 2.82a.308.308 0 01.306.337v.087a2.529 2.529 0 01-.041.29 2.85 2.85 0 00-.035.553.242.242 0 00.1.153v.007l.007.129c.967.088 1.87.522 2.54 1.223l.116-.082a.34.34 0 00.186-.02c.149-.11.287-.236.412-.373.063-.075.13-.146.202-.213l.051-.04.017-.014a.307.307 0 11.381.477l-.024.02c-.015.012-.03.025-.043.034a2.537 2.537 0 01-.254.148 2.87 2.87 0 00-.455.32.241.241 0 00-.058.172l-.05.044-.058.053c.542.806.77 1.783.637 2.745l.123.036c.031.055.077.101.133.132.179.048.363.078.548.09zM7.291 5.24c.107-.024.216-.043.326-.056l-.09 1.6-.008.004a.268.268 0 01-.293.256.27.27 0 01-.135-.05l-.002.001-1.316-.93c.419-.41.945-.696 1.518-.825zm1.618 1.75l1.308-.924a3.182 3.182 0 00-1.833-.882l.09 1.598h.002a.268.268 0 00.294.256.27.27 0 00.135-.05l.004.002zm2.248 1.656L9.609 8.2l-.002-.006a.27.27 0 01-.185-.343.27.27 0 01.08-.12L9.5 7.73l1.195-1.067c.366.594.527 1.29.46 1.983zM9.096 9.5l.618 1.49a3.148 3.148 0 001.275-1.598l-1.593-.269-.002.003a.26.26 0 00-.166.023.27.27 0 00-.13.348l-.002.003zm-.385 1.905c-.573.13-1.17.1-1.727-.088l.777-1.4h.001a.27.27 0 01.475-.001h.006l.779 1.402a3.286 3.286 0 01-.311.087zm-2.418-.422l.611-1.474-.004-.006a.268.268 0 00-.297-.37L6.6 9.13l-1.579.267a3.16 3.16 0 001.272 1.586zm-.997-4.32l1.201 1.071-.001.007a.269.269 0 01-.106.462l-.001.005-1.54.443a3.134 3.134 0 01.447-1.988zm2.95 1.154h-.492l-.307.38.11.476.443.213.442-.212.11-.476-.306-.381z"
                        clip-rule="evenodd"
                      ></path>
                    </g>
                  </svg>
                </SvgIcon>
              }
            />
            <Chip
              clickable
              onClick={onGitHubChipClick}
              label="GitHub"
              icon={
                <SvgIcon>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
                    <path d="M10.226 17.284c-2.965-.36-5.054-2.493-5.054-5.256 0-1.123.404-2.336 1.078-3.144-.292-.741-.247-2.314.09-2.965.898-.112 2.111.36 2.83 1.01.853-.269 1.752-.404 2.853-.404 1.1 0 1.999.135 2.807.382.696-.629 1.932-1.1 2.83-.988.315.606.36 2.179.067 2.942.72.854 1.101 2 1.101 3.167 0 2.763-2.089 4.852-5.098 5.234.763.494 1.28 1.572 1.28 2.807v2.336c0 .674.561 1.056 1.235.786 4.066-1.55 7.255-5.615 7.255-10.646C23.5 6.188 18.334 1 11.978 1 5.62 1 .5 6.188.5 12.545c0 4.986 3.167 9.12 7.435 10.669.606.225 1.19-.18 1.19-.786V20.63a2.9 2.9 0 0 1-1.078.224c-1.483 0-2.359-.808-2.987-2.313-.247-.607-.517-.966-1.034-1.033-.27-.023-.359-.135-.359-.27 0-.27.45-.471.898-.471.652 0 1.213.404 1.797 1.235.45.651.921.943 1.483.943.561 0 .92-.202 1.437-.719.382-.381.674-.718.944-.943"></path>
                  </svg>
                </SvgIcon>
              }
            />
          </Stack>
        </Stack>
        <JobSummaryCards />
        <JobForm />
        <QueueJobDetailsTable />
      </Stack>
    </Container>
  );
}
