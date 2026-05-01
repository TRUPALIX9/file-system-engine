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
  allProviders?: StorageProviderDescriptor[];
  onSelectProvider?: (p: StorageProviderDescriptor) => void;
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
  isTransferring,
  allProviders,
  onSelectProvider
}) => {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Transfer Hub</Typography>
          <Typography color="text.secondary">Move or Copy files between connected drives and folders.</Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button 
            variant="contained" 
            color="secondary" 
            startIcon={isTransferring ? <CircularProgress size={20} color="inherit" /> : <CustomIcon name="copy" size={20} />}
            disabled={isTransferring || !listing || !listingRight || (focusedPane === 'left' ? selectedEntries.length === 0 : selectedEntriesRight.length === 0)}
            onClick={() => onExecuteTransfer('copy')}
            sx={{ px: 3 }}
          >
            Copy
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={isTransferring ? <CircularProgress size={20} color="inherit" /> : <CustomIcon name="move" size={20} />}
            disabled={isTransferring || !listing || !listingRight || (focusedPane === 'left' ? selectedEntries.length === 0 : selectedEntriesRight.length === 0)}
            onClick={() => onExecuteTransfer('move')}
            sx={{ px: 3 }}
          >
            Move
          </Button>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', gap: 2, minHeight: 0 }}>
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
            allProviders={allProviders}
            onSelectProvider={onSelectProvider}
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
            allProviders={allProviders}
            onSelectProvider={onSelectProvider}
          />
        </Box>
      </Box>
    </Box>
  );
};
