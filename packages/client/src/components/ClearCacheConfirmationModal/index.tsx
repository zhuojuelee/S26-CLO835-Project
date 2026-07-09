import { useCallback, useEffect, useState } from 'react';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

type ClearCacheConfirmationModalProps = {
  error: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (adminSecret: string) => Promise<boolean>;
  open: boolean;
};

export default function ClearCacheConfirmationModal({
  error,
  isSubmitting,
  onClose,
  onConfirm,
  open,
}: ClearCacheConfirmationModalProps) {
  const [adminSecret, setAdminSecret] = useState('');
  const trimmedAdminSecret = adminSecret.trim();

  useEffect(() => {
    if (!open) {
      setAdminSecret('');
    }
  }, [open]);

  const handleConfirm = useCallback(async () => {
    if (!trimmedAdminSecret) {
      return;
    }

    const didClearJobs = await onConfirm(trimmedAdminSecret);

    if (didClearJobs) {
      setAdminSecret('');
      onClose();
    }
  }, [onClose, onConfirm, trimmedAdminSecret]);

  return (
    <Dialog fullWidth maxWidth="xs" onClose={isSubmitting ? undefined : onClose} open={open}>
      <DialogTitle>Clear job records</DialogTitle>
      <DialogContent>
        <Stack spacing={3}>
          <Typography color="text.secondary" variant="body2">
            This will delete all Redis job records.
          </Typography>
          <TextField
            autoFocus
            disabled={isSubmitting}
            fullWidth
            label="Admin secret"
            onChange={(event) => {
              setAdminSecret(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                void handleConfirm();
              }
            }}
            size="small"
            type="password"
            value={adminSecret}
          />
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ pb: 2, px: 2 }}>
        <Button disabled={isSubmitting} onClick={onClose}>
          Cancel
        </Button>
        <Button
          color="error"
          disabled={!trimmedAdminSecret || isSubmitting}
          onClick={() => {
            void handleConfirm();
          }}
          startIcon={isSubmitting ? <CircularProgress color="inherit" size={16} /> : <DeleteOutlineIcon />}
          variant="contained"
        >
          Clear
        </Button>
      </DialogActions>
    </Dialog>
  );
}
