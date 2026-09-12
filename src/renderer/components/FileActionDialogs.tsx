import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Button, TextField
} from '@mui/material';

interface NameDialogProps {
  open: boolean;
  title: string;
  confirmLabel: string;
  initialValue: string;
  onCancel: () => void;
  onSubmit: (name: string) => void;
}

// Names are single path segments; the main process re-validates them.
function nameProblem(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Enter a name.';
  if (trimmed === '.' || trimmed === '..') return 'This name is reserved.';
  if (/[\\/]/.test(trimmed)) return 'Names cannot contain / or \\.';
  return null;
}

/** Asks for a file or folder name (New Folder, Rename). */
export const NameDialog: React.FC<NameDialogProps> = ({ open, title, confirmLabel, initialValue, onCancel, onSubmit }) => {
  const [value, setValue] = React.useState(initialValue);

  React.useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  const problem = nameProblem(value);
  const submit = () => {
    if (!problem) onSubmit(value.trim());
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>{title}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          size="small"
          margin="dense"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          error={Boolean(problem) && value.length > 0}
          helperText={value.length > 0 ? problem ?? ' ' : ' '}
          slotProps={{ htmlInput: { 'aria-label': 'Name' } }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={Boolean(problem)}>{confirmLabel}</Button>
      </DialogActions>
    </Dialog>
  );
};

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Confirms a Move or Delete before anything is sent to the main process. */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ open, title, message, confirmLabel, destructive, onCancel, onConfirm }) => (
  <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
    <DialogTitle sx={{ fontWeight: 800 }}>{title}</DialogTitle>
    <DialogContent>
      <DialogContentText component="div" sx={{ wordBreak: 'break-word' }}>{message}</DialogContentText>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2 }}>
      <Button onClick={onCancel}>Cancel</Button>
      <Button variant="contained" color={destructive ? 'error' : 'primary'} onClick={onConfirm} autoFocus>{confirmLabel}</Button>
    </DialogActions>
  </Dialog>
);
