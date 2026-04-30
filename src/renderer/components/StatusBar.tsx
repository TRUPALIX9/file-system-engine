import React from 'react';
import { Box, Typography, Divider, LinearProgress } from '@mui/material';
import { FileEntry, DirectoryListing } from '@shared/types';

interface StatusBarProps {
  focusedPane: 'left' | 'right';
  selectedEntries: FileEntry[];
  selectedEntriesRight: FileEntry[];
  listing: DirectoryListing | null;
  listingRight: DirectoryListing | null;
  appName: string;
  loadState: 'loading' | 'ready' | 'error';
}

export const StatusBar: React.FC<StatusBarProps> = ({
  focusedPane,
  selectedEntries,
  selectedEntriesRight,
  listing,
  listingRight,
  appName,
  loadState
}) => {
  const activeEntries = focusedPane === 'left' ? selectedEntries : selectedEntriesRight;
  const activeListing = focusedPane === 'left' ? listing : listingRight;

  return (
    <>
      <Box sx={{ 
        height: 28, 
        bgcolor: 'background.paper', 
        borderTop: '1px solid', 
        borderColor: 'divider', 
        display: 'flex', 
        alignItems: 'center', 
        px: 2,
        justifyContent: 'space-between',
        position: 'relative'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {activeEntries.length === 0 ? 'Ready' : activeEntries.length === 1 ? `Selected: ${activeEntries[0].name}` : `${activeEntries.length} items selected`}
          </Typography>
          <Divider orientation="vertical" flexItem sx={{ height: 12, my: 'auto' }} />
          <Typography variant="caption" color="text.secondary">
            {activeListing ? `${activeListing.entries.length} items` : '0 items'}
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700 }}>
          {appName} v0.1.0-Stable
        </Typography>
      </Box>
      {loadState === "loading" && (
        <LinearProgress 
          sx={{ 
            position: 'absolute', 
            bottom: 0, 
            left: 0, 
            right: 0, 
            height: 2,
            zIndex: 1000 
          }} 
        />
      )}
    </>
  );
};
