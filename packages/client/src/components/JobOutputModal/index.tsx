import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';

type JobOutputModalProps = {
  jobId: string;
  messages: string[];
  onClose: () => void;
  open: boolean;
};

export default function JobOutputModal({ jobId, messages, onClose, open }: JobOutputModalProps) {
  return (
    <Dialog fullWidth maxWidth="sm" onClose={onClose} open={open}>
      <DialogTitle sx={{ alignItems: 'center', display: 'flex', gap: 2, justifyContent: 'space-between' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography component="div" variant="h6">
            Job output
          </Typography>
          <Typography
            color="text.secondary"
            component="div"
            sx={{ overflowWrap: 'anywhere' }}
            variant="caption"
          >
            {jobId}
          </Typography>
        </Box>
        <IconButton aria-label="Close job output" onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack component="ol" spacing={1.5} sx={{ m: 0, pl: 3 }}>
          {messages.map((message, index) => (
            <Box component="li" key={`${index}-${message}`}>
              <Typography sx={{ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }} variant="body2">
                {message}
              </Typography>
            </Box>
          ))}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
