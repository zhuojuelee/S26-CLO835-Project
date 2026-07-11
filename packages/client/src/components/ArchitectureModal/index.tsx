import archImg from '../../assets/architecture.png';
import { Box, Modal, Stack, Typography } from '@mui/material';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  bgcolor: 'background.paper',
  boxShadow: 32,
  p: 4,
};

const imgStyle = {
  width: 1280,
  height: 720,
};

export default function ArchitectureModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose}>
      <Stack>
        <Box sx={style}>
          <Box component="img" src={archImg} alt="Architecture" sx={imgStyle} />
        </Box>
      </Stack>
    </Modal>
  );
}
