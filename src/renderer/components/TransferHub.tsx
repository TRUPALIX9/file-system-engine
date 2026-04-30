import React from 'react';
import { Box, Typography, Button, Stack, CircularProgress } from '@mui/material';
import { FilePane } from './FilePane';
import { FileEntry, DirectoryListing, StorageProviderDescriptor } from '@shared/types';
import { CustomIcon } from './CustomIcon';

interface TransferHubProps {
  focusedPane: 'left' | 'right';
  setFocusedPane: (pane: 'left' | 'right') => void;
  listing: DirectoryListing | null;
  listingRight: DirectoryListing | null;
  selectedProvider: StorageProviderDescriptor | null;
  selectedProviderRight: StorageProviderDescriptor | null;
  selectedEntries: FileEntry[];
  selectedEntriesRight: FileEntry[];
  loadingLeft: boolean;
  loadingRight: boolean;
  onSelectEntries: (entries: FileEntry[], pane: 'left' | 'right') => void;
  onOpenEntry: (entry: FileEntry, pane: 'left' | 'right') => void;
  onNavigateTo: (path: string, pane: 'left' | 'right') => void;
  onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void;
  onExecuteTransfer: (kind: 'copy' | 'move') => void;
  globalError: string | null;
  isTransferring: boolean;
}

export const TransferHub: React.FC<TransferHubProps> = ({
  focusedPane,
  setFocusedPane,
  listing,
  listingRight,
  selectedProvider,
  selectedProviderRight,
  selectedEntries,
  selectedEntriesRight,
  loadingLeft,
  loadingRight,
  onSelectEntries,
  onOpenEntry,
  onNavigateTo,
  onContextMenu,
  onExecuteTransfer,
  globalError,
  isTransferring
}) => {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Transfer Hub</Typography>
          <Typography variant="body2" color="text.secondary">Move or Copy files between connected drives and folders.</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button 
            variant="contained" 
            size="medium" 
            disabled={isTransferring || !listing || !listingRight || (focusedPane === 'left' ? selectedEntries.length === 0 : selectedEntriesRight.length === 0)}
            startIcon={isTransferring ? <CircularProgress size={18} color="inherit" /> : <CustomIcon name="copy" size={18} />} 
            onClick={() => onExecuteTransfer('copy')}
            sx={{ px: 3, bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
          >
            Copy
          </Button>
          <Button 
            variant="contained" 
            size="medium" 
            disabled={isTransferring || !listing || !listingRight || (focusedPane === 'left' ? selectedEntries.length === 0 : selectedEntriesRight.length === 0)}
            startIcon={isTransferring ? <CircularProgress size={18} color="inherit" /> : <CustomIcon name="move" size={18} />} 
            onClick={() => onExecuteTransfer('move')}
            sx={{ px: 3 }}
          >
            Move
          </Button>
        </Stack>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', gap: 1 }}>
        <Box sx={{ 
          flex: 1, 
          minWidth: 0, 
          border: '1px solid', 
          borderColor: focusedPane === 'left' ? 'primary.main' : 'divider', 
          borderRadius: 2, 
          overflow: 'hidden', 
          transition: 'border-color 0.2s' 
        }}>
          <FilePane 
            pane="left"
            currentListing={listing}
            currentProvider={selectedProvider}
            selectedEntries={selectedEntries}
            loading={loadingLeft}
            onSelectEntries={(e) => onSelectEntries(e, 'left')}
            onOpenEntry={onOpenEntry}
            onNavigateTo={onNavigateTo}
            onContextMenu={onContextMenu}
            onNewFolder={() => {}}
            globalError={globalError}
            focusedPane={focusedPane}
            setFocusedPane={setFocusedPane}
          />
        </Box>
        <Box sx={{ 
          flex: 1, 
          minWidth: 0, 
          border: '1px solid', 
          borderColor: focusedPane === 'right' ? 'primary.main' : 'divider', 
          borderRadius: 2, 
          overflow: 'hidden', 
          transition: 'border-color 0.2s' 
        }}>
          <FilePane 
            pane="right"
            currentListing={listingRight}
            currentProvider={selectedProviderRight}
            selectedEntries={selectedEntriesRight}
            loading={loadingRight}
            onSelectEntries={(e) => onSelectEntries(e, 'right')}
            onOpenEntry={onOpenEntry}
            onNavigateTo={onNavigateTo}
            onContextMenu={onContextMenu}
            onNewFolder={() => {}}
            globalError={globalError}
            focusedPane={focusedPane}
            setFocusedPane={setFocusedPane}
          />
        </Box>
      </Box>
    </Box>
  );
};
