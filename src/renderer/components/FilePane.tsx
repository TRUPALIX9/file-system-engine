import React from 'react';
import { 
  Box, Typography, IconButton, Button, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, alpha, 
  Breadcrumbs, Link, styled, useTheme, Fade, CircularProgress,
  Divider, Menu, MenuItem, ListItemIcon, Checkbox, TableSortLabel, Tooltip
} from '@mui/material';
import {
  ChevronRight as ChevronRightIcon,
  Folder as FolderIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Description as FileIcon,
  ErrorOutlined as ErrorIcon
} from '@mui/icons-material';
import { FileEntry, DirectoryListing, StorageProviderDescriptor, MountedFilesystemDescriptor } from '@shared/types';
import { CustomIcon } from './CustomIcon';
import { FileEntryIcon } from './FileEntryIcon';

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
  currentProvider: StorageProviderDescriptor | null;
  selectedEntries: FileEntry[];
  loading: boolean;
  onSelectEntries: (entries: FileEntry[]) => void;
  onOpenEntry: (entry: FileEntry, pane: 'left' | 'right') => void;
  onNavigateTo: (path: string, pane: 'left' | 'right') => void;
  onContextMenu: (e: React.MouseEvent, entry: FileEntry, pane: 'left' | 'right') => void;
  onNewFolder: () => void;
  globalError: string | null;
  focusedPane: 'left' | 'right';
  setFocusedPane: (pane: 'left' | 'right') => void;
  allProviders?: StorageProviderDescriptor[];
  onSelectProvider?: (p: StorageProviderDescriptor) => void;
}

export const FilePane: React.FC<FilePaneProps> = ({
  pane,
  currentListing,
  currentProvider,
  selectedEntries,
  loading,
  onSelectEntries,
  onOpenEntry,
  onNavigateTo,
  onContextMenu,
  onNewFolder,
  globalError,
  focusedPane,
  setFocusedPane,
  allProviders,
  onSelectProvider
}) => {
  const theme = useTheme();
  const [driveMenuAnchor, setDriveMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [sortKey, setSortKey] = React.useState<'name' | 'kind' | 'size'>('name');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');
  const isFocused = focusedPane === pane;

  const sortedEntries = React.useMemo(() => {
    if (!currentListing) return [];
    return [...currentListing.entries].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';
      
      if (sortKey === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (sortKey === 'kind') {
        valA = a.kind.toLowerCase();
        valB = b.kind.toLowerCase();
      } else if (sortKey === 'size') {
        valA = a.metadata.sizeBytes || 0;
        valB = b.metadata.sizeBytes || 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [currentListing, sortKey, sortOrder]);

  const handleSort = (key: 'name' | 'kind' | 'size') => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const formatSize = (bytes: number | undefined) => {
    if (bytes === undefined) return '--';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Parent of the listed folder, clamped to the provider root; null at the root (Up disabled).
  const parentPath = React.useMemo(() => {
    if (!currentListing?.directory || !currentProvider) return null;
    const rootPath = currentProvider.kind === 'desktop-filesystem' ? currentProvider.mountPath : '/';
    const stripTrailing = (value: string) => (value.length > 1 ? value.replace(/[\\/]+$/, '') : value);
    const current = stripTrailing(currentListing.directory.path);
    const root = stripTrailing(rootPath);
    if (current.length <= root.length) return null;
    const cut = Math.max(current.lastIndexOf('/'), current.lastIndexOf('\\'));
    if (cut < 0) return null;
    let parent = current.slice(0, cut) || '/';
    if (/^[A-Za-z]:$/.test(parent)) parent += '\\';
    return stripTrailing(parent).length < root.length ? rootPath : parent;
  }, [currentListing, currentProvider]);

  const toggleEntry = (entry: FileEntry) => {
    const isAlreadySelected = selectedEntries.some(se => se.ref.path === entry.ref.path);
    onSelectEntries(isAlreadySelected
      ? selectedEntries.filter(se => se.ref.path !== entry.ref.path)
      : [...selectedEntries, entry]);
  };

  const handleRowClick = (e: React.MouseEvent, entry: FileEntry) => {
    if (e.ctrlKey || e.metaKey) {
      const isAlreadySelected = selectedEntries.some(se => se.ref.path === entry.ref.path);
      if (isAlreadySelected) {
        onSelectEntries(selectedEntries.filter(se => se.ref.path !== entry.ref.path));
      } else {
        onSelectEntries([...selectedEntries, entry]);
      }
    } else if (e.shiftKey && selectedEntries.length > 0 && currentListing) {
      const lastSelected = selectedEntries[selectedEntries.length - 1];
      const lastIdx = currentListing.entries.findIndex(en => en.ref.path === lastSelected.ref.path);
      const currentIdx = currentListing.entries.findIndex(en => en.ref.path === entry.ref.path);
      
      if (lastIdx !== -1 && currentIdx !== -1) {
        const start = Math.min(lastIdx, currentIdx);
        const end = Math.max(lastIdx, currentIdx);
        const range = currentListing.entries.slice(start, end + 1);
        onSelectEntries(Array.from(new Set([...selectedEntries, ...range])));
      }
    } else {
      onSelectEntries([entry]);
    }
  };
  
  const renderBreadcrumbs = () => {
    if (!currentListing || !currentProvider || !currentListing.directory) return null;

    const path = currentListing.directory.path;
    const rootPath = currentProvider.kind === 'desktop-filesystem' ? currentProvider.mountPath : '/';
    const crumbs: { name: string; path: string }[] = [];
    crumbs.push({ name: currentProvider.displayName || "Root", path: rootPath });

    if (path && path.startsWith(rootPath)) {
      const relativePath = path.slice(rootPath.length).split(/[\\/]/).filter(Boolean);
      let cumulative = rootPath;
      relativePath.forEach(part => {
        cumulative = cumulative + (cumulative.endsWith("/") || cumulative.endsWith("\\") ? "" : "/") + part;
        crumbs.push({ name: part, path: cumulative });
      });
    }

    return (
      <Breadcrumbs aria-label="Current folder" separator={<ChevronRightIcon sx={{ fontSize: 14 }} />} sx={{ ml: 1 }}>
        {crumbs.map((crumb, idx) => (
          <Link
            key={crumb.path}
            component="button"
            type="button"
            variant="caption"
            underline="hover"
            aria-current={idx === crumbs.length - 1 ? 'location' : undefined}
            sx={{ 
              cursor: 'pointer',
              fontWeight: idx === crumbs.length - 1 ? 700 : 400,
              color: idx === crumbs.length - 1 ? "text.primary" : "text.secondary",
              '&:hover': { color: 'primary.main' }
            }}
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); onNavigateTo(crumb.path, pane); }}
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title="Select drive">
            <IconButton 
              size="small" 
              aria-label="Select drive"
              aria-haspopup="menu"
              onClick={(e) => setDriveMenuAnchor(e.currentTarget)}
              sx={{ 
                color: 'primary.main',
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.15) }
              }}
            >
              <CustomIcon name="storage" size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Up one level">
            <span>
              <IconButton size="small" aria-label="Up one level" onClick={() => parentPath && onNavigateTo(parentPath, pane)} disabled={!parentPath}>
                <CustomIcon name="up" size={18} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
        <Divider orientation="vertical" flexItem sx={{ mx: 1, height: 16, my: 'auto' }} />
        {renderBreadcrumbs()}
        <Box sx={{ flex: 1 }} />
        <Tooltip title="New folder">
          <span>
            <IconButton 
              size="small" 
              color="primary"
              aria-label="New folder"
              disabled={!currentListing || !currentProvider?.capabilities.canCreateFolder} 
              onClick={onNewFolder}
              sx={{ 
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
              }}
            >
              <CustomIcon name="create-folder" size={18} />
            </IconButton>
          </span>
        </Tooltip>

        <Menu
          anchorEl={driveMenuAnchor}
          open={Boolean(driveMenuAnchor)}
          onClose={() => setDriveMenuAnchor(null)}
          slotProps={{
            paper: {
              sx: {
                mt: 1,
                minWidth: 200,
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                borderRadius: 2
              }
            }
          }}
        >
          <Typography variant="overline" sx={{ px: 2, py: 1, display: 'block', color: 'text.disabled', fontWeight: 800 }}>
            Select Drive
          </Typography>
          {allProviders?.map((p) => (
            <MenuItem 
              key={p.id} 
              onClick={() => {
                onSelectProvider?.(p);
                setDriveMenuAnchor(null);
              }}
              selected={p.id === currentProvider?.id}
            >
              <ListItemIcon>
                <CustomIcon name={p.kind === 'android-adb' ? 'android' : 'storage'} size={18} />
              </ListItemIcon>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.displayName}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {p.kind === 'android-adb' ? 'Android Device' : (p as any).mountPath || '/'}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Menu>
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
              onClick={() => {
                if (!currentProvider) return;
                const rootPath = currentProvider.kind === 'desktop-filesystem' 
                  ? (currentProvider as MountedFilesystemDescriptor).mountPath 
                  : '/';
                onNavigateTo(rootPath, pane);
              }}
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
                  <TableCell padding="checkbox" sx={{ width: 48 }}>
                    <Checkbox
                      size="small"
                      slotProps={{ input: { 'aria-label': 'Select all items' } }}
                      indeterminate={selectedEntries.length > 0 && selectedEntries.length < (currentListing?.entries.length || 0)}
                      checked={currentListing?.entries.length ? selectedEntries.length === currentListing.entries.length : false}
                      onChange={(e) => {
                        if (e.target.checked && currentListing) {
                          onSelectEntries(currentListing.entries);
                        } else {
                          onSelectEntries([]);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                    <TableSortLabel
                      active={sortKey === 'name'}
                      direction={sortKey === 'name' ? sortOrder : 'asc'}
                      onClick={() => handleSort('name')}
                    >
                      Name
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                    <TableSortLabel
                      active={sortKey === 'kind'}
                      direction={sortKey === 'kind' ? sortOrder : 'asc'}
                      onClick={() => handleSort('kind')}
                    >
                      Kind
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }} align="right">
                    <TableSortLabel
                      active={sortKey === 'size'}
                      direction={sortKey === 'size' ? sortOrder : 'asc'}
                      onClick={() => handleSort('size')}
                    >
                      Size
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedEntries.map((entry) => {
                  const isSelected = selectedEntries.some(se => se.ref.path === entry.ref.path);
                  return (
                    <StyledTableRow 
                      key={entry.ref.path}
                      selected={isSelected}
                      tabIndex={0}
                      aria-selected={isSelected}
                      onClick={(e) => handleRowClick(e, entry)}
                      onDoubleClick={() => onOpenEntry(entry, pane)}
                      onKeyDown={(e) => {
                        if (e.target !== e.currentTarget) return;
                        if (e.key === 'Enter') { e.preventDefault(); onOpenEntry(entry, pane); }
                        if (e.key === ' ') { e.preventDefault(); toggleEntry(entry); }
                      }}
                      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, entry, pane); }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={isSelected}
                          slotProps={{ input: { 'aria-label': `Select ${entry.name}` } }}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleEntry(entry);
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', py: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <FileEntryIcon entry={entry} size={18} />
                          <Typography variant="body2" noWrap sx={{ fontSize: '0.8rem' }}>{entry.name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{entry.kind}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }} align="right">
                        {formatSize(entry.metadata.sizeBytes)}
                      </TableCell>
                    </StyledTableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Box>
  );
};
