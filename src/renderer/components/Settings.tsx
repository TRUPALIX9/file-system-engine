import React from 'react';
import { 
  Box, Typography, Card, CardContent, Button, ToggleButtonGroup, 
  ToggleButton, Chip 
} from '@mui/material';
import {
  Security as SecurityIcon,
  Palette as PaletteIcon
} from '@mui/icons-material';

interface SettingsProps {
  isMac: boolean;
  hasFullDiskAccess: boolean | null;
  themeMode: 'light' | 'dark' | 'system';
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
}

export const Settings: React.FC<SettingsProps> = ({
  isMac,
  hasFullDiskAccess,
  themeMode,
  setThemeMode
}) => {
  return (
    <Box sx={{ maxWidth: 700, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 800 }}>Settings</Typography>
      
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SecurityIcon color="primary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>System Permissions</Typography>
            </Box>
            {isMac && (
              <Chip 
                size="small" 
                label={hasFullDiskAccess === true ? "Access Granted" : hasFullDiskAccess === false ? "Access Restricted" : "Checking..."}
                color={hasFullDiskAccess === true ? "success" : hasFullDiskAccess === false ? "error" : "default"}
                variant="filled"
                sx={{ fontWeight: 700, fontSize: '0.65rem' }}
              />
            )}
          </Box>
          {isMac ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Granting Full Disk Access allows the engine to browse protected system folders and connected drives.
              </Typography>
              <Button 
                variant="outlined" 
                size="small" 
                onClick={() => (window as any).fileSystemEngine.app.openExternal({ url: "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles" })}
              >
                Configure macOS Permissions
              </Button>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              The engine browses drives and folders with your account's normal file permissions. No extra access is needed on this platform.
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <PaletteIcon color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Appearance</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
            <Typography variant="body2">Theme preference</Typography>
            <ToggleButtonGroup size="small" value={themeMode} exclusive onChange={(_, v) => v && setThemeMode(v)}>
              <ToggleButton value="light">Light</ToggleButton>
              <ToggleButton value="dark">Dark</ToggleButton>
              <ToggleButton value="system">System</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
