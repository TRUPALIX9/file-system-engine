import React, { ReactElement, useState, useMemo } from 'react';
import {
  Box, ThemeProvider, createTheme, CssBaseline,
  Menu, MenuItem, ListItemIcon, Divider,
  Typography,
  Button
} from '@mui/material';
import { useFileSystem } from './hooks/useFileSystem';
import { CustomIcon } from './components/CustomIcon';
import { Sidebar } from './components/Sidebar';
import { FilePane } from './components/FilePane';
import { TransferHub } from './components/TransferHub';
import { StorageAnalyzer } from './components/StorageAnalyzer';
import { Settings } from './components/Settings';
import { StatusBar } from './components/StatusBar';
import { SecurityDialog } from './components/SecurityDialog';
import { BRAND, APP_NAME, ThemeMode } from './constants';
import { FileEntry } from '@shared/types';

// Error Boundary for stability
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return (
      <Box sx={{ p: 4, height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 2, color: 'error.main' }}>System Error</Typography>
        <Typography sx={{ mb: 4, color: 'text.secondary' }}>The engine encountered an unexpected error while rendering this view.</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" onClick={() => this.setState({ hasError: false })}>Return to Home</Button>
          <Button variant="contained" onClick={() => window.location.reload()}>Hard Restart</Button>
        </Box>
      </Box>
    );
    return this.props.children;
  }
}

export function App(): ReactElement {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => (localStorage.getItem("app-theme") as ThemeMode) || "system");
  const [activeTab, setActiveTab] = useState<"Explorer" | "Operations" | "Settings" | "Analyze">("Explorer");
  const [focusedPane, setFocusedPane] = useState<"left" | "right">("left");
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement; entry: FileEntry } | null>(null);

  const isDark = themeMode === "dark" || (themeMode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const isMac = (window as any).fileSystemEngine?.platform === 'darwin';

  const {
    inventory,
    allDesktopProviders,
    selectedProviderId,
    setSelectedProviderId,
    selectedProviderIdRight,
    setSelectedProviderIdRight,
    listing,
    listingRight,
    selectedEntry,
    setSelectedEntry,
    selectedEntryRight,
    setSelectedEntryRight,
    loadingLeft,
    loadingRight,
    error,
    setError,
    loadState,
    hasFullDiskAccess,
    hasStartedUp,
    setHasStartedUp,
    pinnedFolders,
    browseProvider,
    togglePin
  } = useFileSystem(isMac);

  const theme = useMemo(() => createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      primary: { main: '#38BDF8' }, // Brand Sky Blue
      secondary: { main: '#14B8A6' }, // Brand Teal
      background: {
        default: isDark ? '#0F172A' : '#F8FAFC', // Brand Navy / Light
        paper: isDark ? '#1E293B' : '#E2E8F0' // Brand Slate / Lighter
      },
    },
    typography: { fontFamily: 'Inter, system-ui, sans-serif', h5: { fontWeight: 800 } },
    shape: { borderRadius: 8 },
    components: {
      MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
      MuiListItemButton: { styleOverrides: { root: { '&.Mui-selected': { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(56, 189, 248, 0.15)' } } } },
    }
  }), [isDark]);

  // Sync startup
  React.useEffect(() => {
    if (!hasStartedUp && inventory && allDesktopProviders.length > 0) {
      const systemProvider = allDesktopProviders.find(p => p.displayName === 'System' || p.id === 'root');
      if (systemProvider) {
        setActiveTab("Explorer");
        setSelectedProviderId(systemProvider.id);
        void browseProvider(systemProvider, systemProvider.mountPath, 'left');
        setHasStartedUp(true);
      }
    }
  }, [inventory, allDesktopProviders, hasStartedUp, browseProvider, setSelectedProviderId, setHasStartedUp]);

  const handleSelectProvider = async (p: any) => {
    setActiveTab("Explorer");
    if (focusedPane === 'left') {
      setSelectedProviderId(p.id);
      setSelectedEntry(null);
      await browseProvider(p, p.mountPath, 'left');
    } else {
      setSelectedProviderIdRight(p.id);
      setSelectedEntryRight(null);
      await browseProvider(p, p.mountPath, 'right');
    }
  };

  const handleBrowsePinned = async (pin: any) => {
    const provider = allDesktopProviders.find(p => p.id === pin.providerId);
    if (provider) {
      setActiveTab("Explorer");
      if (focusedPane === 'left') {
        setSelectedProviderId(pin.providerId);
        await browseProvider(provider, pin.path, 'left');
      } else {
        setSelectedProviderIdRight(pin.providerId);
        await browseProvider(provider, pin.path, 'right');
      }
    }
  };

  async function executeTransfer(kind: "copy" | "move"): Promise<void> {
    const sourcePane = focusedPane;
    const destPane = focusedPane === "left" ? "right" : "left";

    const sourceEntry = sourcePane === "left" ? selectedEntry : selectedEntryRight;
    const sourceProvider = sourcePane === "left" ? allDesktopProviders.find(p => p.id === selectedProviderId) : allDesktopProviders.find(p => p.id === selectedProviderIdRight);
    const destProvider = destPane === "left" ? allDesktopProviders.find(p => p.id === selectedProviderId) : allDesktopProviders.find(p => p.id === selectedProviderIdRight);
    const destListing = destPane === "left" ? listing : listingRight;

    if (!sourceEntry || !sourceProvider || !destProvider || !destListing) {
      setError("Please select a file and ensure both panes have a destination open.");
      return;
    }

    const engine = (window as any).fileSystemEngine;
    if (!engine) return;

    const destPath = destListing.directory.path === "/" ? `/${sourceEntry.name}` : `${destListing.directory.path}/${sourceEntry.name}`;
    const operation = {
      id: Math.random().toString(36).substring(7),
      kind,
      source: { providerId: sourceProvider.id, providerKind: "desktop-filesystem" as const, path: sourceEntry.ref.path },
      destination: { providerId: destProvider.id, providerKind: "desktop-filesystem" as const, path: destPath }
    };

    if (destPane === "left") browseProvider(destProvider, destListing.directory.path, 'left'); // Placeholder trigger

    const result = await engine.operations.executePlan({
      planId: Math.random().toString(36).substring(7),
      operations: [operation],
      confirmed: true
    });

    if (result.ok && result.data.status === "completed") {
      await browseProvider(destProvider, destListing.directory.path, destPane);
      if (kind === "move" && sourceProvider) {
        const parentPath = sourceEntry.ref.path.substring(0, sourceEntry.ref.path.lastIndexOf('/')) || "/";
        await browseProvider(sourceProvider, parentPath, sourcePane);
      }
    } else {
      setError(result.error?.message || "Operation failed.");
    }
  }

  const selectedProviderLeft = allDesktopProviders.find(p => p.id === selectedProviderId) || null;
  const selectedProviderRightActual = allDesktopProviders.find(p => p.id === selectedProviderIdRight) || null;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <Box sx={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            inventory={inventory}
            allDesktopProviders={allDesktopProviders}
            selectedProviderId={selectedProviderId}
            selectedProviderIdRight={selectedProviderIdRight}
            isMac={isMac}
            pinnedFolders={pinnedFolders}
            onSelectProvider={handleSelectProvider}
            onBrowsePinned={handleBrowsePinned}
            brandName={BRAND}
            isDark={isDark}
          />

          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <Box sx={{ flex: 1, p: 3, overflowY: 'auto', minHeight: 0 }}>
              {activeTab === "Explorer" && (
                <FilePane
                  pane={focusedPane}
                  currentListing={focusedPane === 'left' ? listing : listingRight}
                  currentProvider={focusedPane === 'left' ? selectedProviderLeft : selectedProviderRightActual}
                  selectedEntry={focusedPane === 'left' ? selectedEntry : selectedEntryRight}
                  loading={focusedPane === 'left' ? loadingLeft : loadingRight}
                  onSelectEntry={(e) => focusedPane === 'left' ? setSelectedEntry(e) : setSelectedEntryRight(e)}
                  onOpenEntry={(entry, p) => browseProvider(focusedPane === 'left' ? selectedProviderLeft! : selectedProviderRightActual!, entry.ref.path, p)}
                  onNavigateTo={(path, p) => browseProvider(focusedPane === 'left' ? selectedProviderLeft! : selectedProviderRightActual!, path, p)}
                  onContextMenu={(e, entry) => setMenuAnchor({ element: e.currentTarget as HTMLElement, entry })}
                  onNewFolder={() => { }}
                  globalError={error}
                  focusedPane={focusedPane}
                  setFocusedPane={setFocusedPane}
                />
              )}

              {activeTab === "Operations" && (
                <TransferHub
                  focusedPane={focusedPane}
                  setFocusedPane={setFocusedPane}
                  listing={listing}
                  listingRight={listingRight}
                  selectedProvider={selectedProviderLeft}
                  selectedProviderRight={selectedProviderRightActual}
                  selectedEntry={selectedEntry}
                  selectedEntryRight={selectedEntryRight}
                  loadingLeft={loadingLeft}
                  loadingRight={loadingRight}
                  onSelectEntry={(e, p) => p === 'left' ? setSelectedEntry(e) : setSelectedEntryRight(e)}
                  onOpenEntry={(entry, p) => browseProvider(p === 'left' ? selectedProviderLeft! : selectedProviderRightActual!, entry.ref.path, p)}
                  onNavigateTo={(path, p) => browseProvider(p === 'left' ? selectedProviderLeft! : selectedProviderRightActual!, path, p)}
                  onContextMenu={(e, entry) => setMenuAnchor({ element: e.currentTarget as HTMLElement, entry })}
                  onExecuteTransfer={executeTransfer}
                  globalError={error}
                />
              )}

              {activeTab === "Analyze" && (
                <StorageAnalyzer
                  providers={allDesktopProviders}
                  isDark={isDark}
                />
              )}

              {activeTab === "Settings" && (
                <Settings
                  isMac={isMac}
                  hasFullDiskAccess={hasFullDiskAccess}
                  themeMode={themeMode}
                  setThemeMode={(m) => { setThemeMode(m); localStorage.setItem("app-theme", m); }}
                />
              )}
            </Box>

            <StatusBar
              focusedPane={focusedPane}
              selectedEntry={selectedEntry}
              selectedEntryRight={selectedEntryRight}
              listing={listing}
              listingRight={listingRight}
              appName={APP_NAME}
              loadState={loadState}
            />
          </Box>
        </Box>

        <Menu anchorEl={menuAnchor?.element} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
          {menuAnchor?.entry.kind === 'directory' && (
            <MenuItem onClick={() => {
              if (menuAnchor) {
                const pid = focusedPane === 'left' ? selectedProviderId : selectedProviderIdRight;
                if (pid) togglePin(menuAnchor.entry, pid);
              }
            }}>
              <ListItemIcon><CustomIcon name="tag" size={18} /></ListItemIcon>
              {pinnedFolders.some(f => f.path === menuAnchor.entry.ref.path) ? 'Unpin from Quick Access' : 'Pin to Quick Access'}
            </MenuItem>
          )}
          <MenuItem onClick={() => setMenuAnchor(null)}><ListItemIcon><CustomIcon name="rename" size={18} /></ListItemIcon> Rename</MenuItem>
          <MenuItem onClick={() => setMenuAnchor(null)} sx={{ color: 'error.main' }}><ListItemIcon><CustomIcon name="trash" size={18} sx={{ color: 'error.main' }} /></ListItemIcon> Delete</MenuItem>
        </Menu>

        <SecurityDialog open={permissionDialogOpen} onClose={() => setPermissionDialogOpen(false)} />
      </ErrorBoundary>
    </ThemeProvider>
  );
}
