import React from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, Typography 
} from '@mui/material';
import { Security as SecurityIcon } from '@mui/icons-material';

interface SecurityDialogProps {
  open: boolean;
  onClose: () => void;
}

export const SecurityDialog: React.FC<SecurityDialogProps> = ({ open, onClose }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800, textAlign: 'center', pt: 3 }}>
        <SecurityIcon sx={{ fontSize: 48, color: 'warning.main', display: 'block', mx: 'auto', mb: 1 }} />
        Permission Required
      </DialogTitle>
      <DialogActions sx={{ px: 3, pb: 3, flexDirection: 'column', gap: 1 }}>
        <Button 
          fullWidth 
          variant="contained" 
          onClick={() => {
            const engine = (window as any).fileSystemEngine;
            if (engine) void engine.app.openExternal({ url: "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles" });
          }}
        >
          Open System Settings
        </Button>
        <Button fullWidth variant="text" size="small" onClick={onClose}>Maybe Later</Button>
      </DialogActions>
    </Dialog>
  );
};
