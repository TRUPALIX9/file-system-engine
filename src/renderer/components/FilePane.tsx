import React from 'react';
import { 
  Box, Typography, IconButton, Button, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, alpha, 
  Breadcrumbs, Link, styled, useTheme, Fade, CircularProgress
} from '@mui/material';
import {
  ChevronRight as ChevronRightIcon,
  Folder as FolderIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Description as FileIcon,
  ErrorOutlined as ErrorIcon
} from '@mui/icons-material';
import { FileEntry, DirectoryListing, MountedFilesystemDescriptor } from '@shared/types';
import { CustomIcon } from './CustomIcon';

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  cursor: 'pointer',
  '&.Mui-selected': {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
    '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.12) },
  },
  '&:hover': { backgroundColor: alpha(theme.palette.text.primary, 0.04) },
}));

interface FilePaneProps {
  pane: 'left' | 'right';
  currentListing: DirectoryListing | null;
  currentProvider: MountedFilesystemDescriptor | null;
  selectedEntry: FileEntry | null;
  loading: boolean;
  onSelectEntry: (entry: FileEntry) => void;
  onOpenEntry: (entry: FileEntry, pane: 'left' | 'right') => void;
  onNavigateTo: (path: string, pane: 'left' | 'right') => void;
  onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void;
  onNewFolder: () => void;
  globalError: string | null;
  focusedPane: 'left' | 'right';
  setFocusedPane: (pane: 'left' | 'right') => void;
}

export const FilePane: React.FC<FilePaneProps> = ({
  pane,
  currentListing,
  currentProvider,
  selectedEntry,
  loading,
  onSelectEntry,
  onOpenEntry,
  onNavigateTo,
  onContextMenu,
  onNewFolder,
  globalError,
  focusedPane,
  setFocusedPane
}) => {
  const theme = useTheme();
  
  const renderBreadcrumbs = () => {
    if (!currentListing || !currentProvider || !currentListing.directory) return null;

    const path = currentListing.directory.path;
    const crumbs: { name: string; path: string }[] = [];
    crumbs.push({ name: currentProvider.displayName || "Root", path: currentProvider.mountPath });

    if (path && currentProvider.mountPath && path.startsWith(currentProvider.mountPath)) {
      const relativePath = path.slice(currentProvider.mountPath.length).split(/[\\/]/).filter(Boolean);
      let cumulative = currentProvider.mountPath;
      relativePath.forEach(part => {
        cumulative = cumulative + (cumulative.endsWith("/") || cumulative.endsWith("\\") ? "" : "/") + part;
        crumbs.push({ name: part, path: cumulative });
      });
    }

    return (
      <Breadcrumbs separator={<ChevronRightIcon sx={{ fontSize: 14 }} />} sx={{ ml: 1 }}>
        {crumbs.map((crumb, idx) => (
          <Link
            key={crumb.path}
            component="button"
            variant="caption"
            underline="hover"
            color={idx === crumbs.length - 1 ? "text.primary" : "inherit"}
            sx={{ fontWeight: idx === crumbs.length - 1 ? 700 : 400 }}
            onClick={(e: any) => { e.stopPropagation(); onNavigateTo(crumb.path, pane); }}
          >
            {crumb.name}
          </Link>
        ))}
      </Breadcrumbs>
    );
  };

  const isPermissionError = globalError?.includes("Full Disk Access");

  return (
    <Box 
      onClick={() => setFocusedPane(pane)}
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        bgcolor: focusedPane === pane ? alpha(theme.palette.primary.main, 0.02) : 'transparent'
      }}
    >
      <Box sx={{ 
        p: 1, 
        borderBottom: '1px solid', 
        borderColor: 'divider', 
        display: 'flex', 
        alignItems: 'center',
        bgcolor: 'background.paper'
      }}>
        <IconButton size="small" onClick={() => onNavigateTo("..", pane)} disabled={!currentListing}>
          <CustomIcon name="up" size={20} />
        </IconButton>
        {renderBreadcrumbs()}
        <Box sx={{ flex: 1 }} />
        <Button 
          size="small" 
          variant="contained" 
          startIcon={<CustomIcon name="create-folder" size={16} />} 
          sx={{ px: 2, fontSize: '0.7rem' }} 
          disabled={!currentProvider}
          onClick={onNewFolder}
        >
          New Folder
        </Button>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {isPermissionError ? (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4, textAlign: 'center' }}>
            <SecurityIcon sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Permission Required</Typography>
            <Box sx={{ mb: 2 }} />
            <Button 
              variant="contained" 
              size="small"
              onClick={() => {
                const engine = (window as any).fileSystemEngine;
                if (engine) void engine.app.openExternal({ url: "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles" });
              }}
              sx={{ mb: 2 }}
            >
              Open System Settings
            </Button>
          </Box>
        ) : globalError ? (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4, textAlign: 'center' }}>
            <ErrorIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Operation Failed</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3, maxWidth: 300 }}>
              {globalError.includes("ENOENT") || globalError.includes("not found") ? "The requested path could not be found. It may have been moved or deleted." : globalError}
            </Typography>
            <Button 
              variant="outlined" 
              size="small"
              onClick={() => currentProvider && onNavigateTo(currentProvider.mountPath, pane)}
            >
              Return to Drive Root
            </Button>
          </Box>
        ) : !currentProvider ? (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'text.disabled' }}>
            <CustomIcon name="storage" size={48} sx={{ mb: 1, opacity: 0.5 }} />
            <Typography variant="body2">Select a drive to start browsing</Typography>
          </Box>
        ) : (
          <TableContainer sx={{ position: 'relative', height: '100%' }}>
            <Fade in={loading}>
              <Box sx={{ 
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                bgcolor: alpha(theme.palette.background.paper, 0.7),
                backdropFilter: 'blur(2px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 10
              }}>
                <CircularProgress size={28} thickness={4} />
              </Box>
            </Fade>
            <Table size="small" stickyHeader sx={{ tableLayout: 'fixed' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Kind</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }} align="right">Size</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {currentListing?.entries.map((entry) => (
                  <StyledTableRow 
                    key={entry.name}
                    selected={selectedEntry?.name === entry.name}
                    onClick={() => onSelectEntry(entry)}
                    onDoubleClick={() => onOpenEntry(entry, pane)}
                    onContextMenu={(e) => onContextMenu(e, entry)}
                  >
                    <TableCell sx={{ fontSize: '0.8rem', py: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {entry.kind === 'directory' ? <CustomIcon name="storage" size={18} sx={{ color: 'primary.main' }} /> : <FileIcon sx={{ color: 'text.secondary', fontSize: 18 }} />}
                        <Typography variant="body2" noWrap sx={{ fontSize: '0.8rem' }}>{entry.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{entry.kind}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }} align="right">
                      {entry.metadata.sizeBytes ? `${(entry.metadata.sizeBytes / 1024).toFixed(1)} KB` : '--'}
                    </TableCell>
                  </StyledTableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Box>
  );
};
