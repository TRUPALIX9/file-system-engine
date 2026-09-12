import React, { ReactElement, useState, useMemo } from 'react';
import {
  Box, ThemeProvider, createTheme, CssBaseline,
  Menu, MenuItem, ListItemIcon,
  Typography,
  Button, Snackbar, Alert
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
import { NameDialog, ConfirmDialog } from './components/FileActionDialogs';
import { BRAND, APP_NAME, ThemeMode } from './constants';
import { FileEntry, FileOperation, StorageProviderDescriptor, MountedFilesystemDescriptor, AndroidProviderDescriptor } from '@shared/types';

type Pane = "left" | "right";

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

/** Joins a folder and a name with the separator the folder path already uses (C:\ vs /). */
function joinPath(directory: string, name: string): string {
  const separator = directory.includes('\\') && !directory.includes('/') ? '\\' : '/';
  return directory.endsWith('/') || directory.endsWith('\\') ? `${directory}${name}` : `${directory}${separator}${name}`;
}

const newId = () => Math.random().toString(36).substring(2, 10);

type NameDialogState = { mode: "create-folder" | "rename"; pane: Pane; entry?: FileEntry };
type ConfirmDialogState =
  | { kind: "move"; entries: FileEntry[] }
  | { kind: "delete"; pane: Pane; entry: FileEntry };

export function App(): ReactElement {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => (localStorage.getItem("app-theme") as ThemeMode) || "system");
  const [activeTab, setActiveTab] = useState<"Explorer" | "Operations" | "Settings" | "Analyze">("Explorer");
  const [focusedPane, setFocusedPane] = useState<Pane>("left");
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement; entry: FileEntry; pane: Pane } | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [nameDialog, setNameDialog] = useState<NameDialogState | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
    selectedEntries,
    setSelectedEntries,
    selectedEntriesRight,
    setSelectedEntriesRight,
    loadingLeft,
    loadingRight,
    error,
    paneErrors,
    loadState,
    hasFullDiskAccess,
    hasStartedUp,
    setHasStartedUp,
    pinnedFolders,
    browseProvider,
    togglePin,
    refresh,
    allProviders
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
    if (inventory && allDesktopProviders.length > 0 && !hasStartedUp) {
      // Pre-select System (Left) and Downloads (Right)
      const systemProvider = allDesktopProviders.find(p => p.id === 'root') || allDesktopProviders[0];
      const downloadsProvider = inventory.knownFolders.find(p => p.displayName === 'Downloads') ||
                          allDesktopProviders.find(p => p.displayName === 'Downloads') ||
                          allDesktopProviders[1];

      if (systemProvider) {
        const path = (systemProvider as MountedFilesystemDescriptor).mountPath || (isMac ? '/' : 'C:\\');
        setSelectedProviderId(systemProvider.id);
        void browseProvider(systemProvider, path, 'left');
      }

      if (downloadsProvider) {
        const path = (downloadsProvider as MountedFilesystemDescriptor).mountPath || (isMac ? '/Users' : 'C:\\Users');
        setSelectedProviderIdRight(downloadsProvider.id);
        void browseProvider(downloadsProvider, path, 'right');
      }

      setActiveTab("Explorer");
      setHasStartedUp(true);
    }
  }, [inventory, allDesktopProviders, hasStartedUp, browseProvider, setSelectedProviderId, setSelectedProviderIdRight, setHasStartedUp, isMac]);

  const selectedProviderLeft = allProviders.find(p => p.id === selectedProviderId) || null;
  const selectedProviderRightActual = allProviders.find(p => p.id === selectedProviderIdRight) || null;

  const providerFor = (pane: Pane) => (pane === 'left' ? selectedProviderLeft : selectedProviderRightActual) as StorageProviderDescriptor | null;
  const listingFor = (pane: Pane) => (pane === 'left' ? listing : listingRight);
  const clearSelection = (pane: Pane) => (pane === 'left' ? setSelectedEntries([]) : setSelectedEntriesRight([]));

  /** Re-lists the folder a pane is showing (used after every file operation). */
  const refreshPane = async (pane: Pane) => {
    const provider = providerFor(pane);
    const current = listingFor(pane);
    if (provider && current) {
      await browseProvider(provider, current.directory.path, pane);
    }
  };

  /** Runs an operation plan and returns the failure message, or null when every step completed. */
  const runPlan = async (operations: FileOperation[]): Promise<string | null> => {
    const engine = (window as any).fileSystemEngine;
    if (!engine) return "Native engine not found.";

    const result = await engine.operations.executePlan({ planId: newId(), operations, confirmed: true });
    if (!result.ok) return result.error?.message || "Operation failed.";
    if (result.data.status === "completed") return null;
    const failed = result.data.logs?.find((log: { status: string; errorMessage?: string }) => log.status === "failed");
    return failed?.errorMessage || "Operation failed.";
  };

  const handleSelectProvider = async (p: StorageProviderDescriptor) => {
    // Only force Explorer tab if we're in a non-pane tab (Settings, Analyze, etc)
    if (activeTab !== "Explorer" && activeTab !== "Operations") {
      setActiveTab("Explorer");
    }

    // Determine the starting path. Desktop has mountPath, Android has roots.
    let startPath = '/';
    if (p.kind === 'android-adb' || p.kind === 'android-mtp') {
      startPath = (p as AndroidProviderDescriptor).roots?.[0]?.path || '/sdcard';
    } else {
      startPath = (p as MountedFilesystemDescriptor).mountPath || '/';
    }

    // Use the focused pane or default to left if none focused
    const targetPane = focusedPane;

    if (targetPane === 'left') {
      setSelectedProviderId(p.id);
      setSelectedEntries([]);
      await browseProvider(p, startPath, 'left');
    } else {
      setSelectedProviderIdRight(p.id);
      setSelectedEntriesRight([]);
      await browseProvider(p, startPath, 'right');
    }
  };

  const handleBrowsePinned = async (pin: any) => {
    const provider = allProviders.find(p => p.id === pin.providerId);
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

  function executeTransfer(kind: "copy" | "move"): void {
    const sourceEntries = focusedPane === "left" ? selectedEntries : selectedEntriesRight;
    const destPane: Pane = focusedPane === "left" ? "right" : "left";

    if (sourceEntries.length === 0 || !providerFor(focusedPane) || !providerFor(destPane) || !listingFor(destPane)) {
      setNotice("Select one or more items and make sure both panes have a folder open.");
      return;
    }

    if (kind === "move") {
      setConfirmDialog({ kind: "move", entries: sourceEntries });
      return;
    }

    void performTransfer("copy", sourceEntries);
  }

  async function performTransfer(kind: "copy" | "move", sourceEntries: FileEntry[]): Promise<void> {
    const sourcePane = focusedPane;
    const destPane: Pane = focusedPane === "left" ? "right" : "left";
    const sourceProvider = providerFor(sourcePane);
    const destProvider = providerFor(destPane);
    const destListing = listingFor(destPane);
    if (!sourceProvider || !destProvider || !destListing) return;

    const operations = sourceEntries.map(entry => ({
      id: newId(),
      kind,
      source: { providerId: sourceProvider.id, providerKind: sourceProvider.kind, path: entry.ref.path },
      destination: { providerId: destProvider.id, providerKind: destProvider.kind, path: joinPath(destListing.directory.path, entry.name) },
      destructive: false,
      requiresConfirmation: kind === "move"
    })) as FileOperation[];

    setIsTransferring(true);
    const failure = await runPlan(operations);
    setIsTransferring(false);

    // Earlier steps of a plan may have completed even when a later one failed, so always refresh.
    await refreshPane(destPane);
    if (kind === "move" || failure) await refreshPane(sourcePane);

    if (failure) {
      setNotice(failure);
    } else {
      clearSelection(sourcePane);
    }
  }

  async function submitName(name: string): Promise<void> {
    if (!nameDialog) return;
    const { mode, pane, entry } = nameDialog;
    const provider = providerFor(pane);
    const current = listingFor(pane);
    setNameDialog(null);
    if (!provider || !current) return;

    const operation: FileOperation = mode === "create-folder"
      ? {
          id: newId(), kind: "create-folder", destructive: false, requiresConfirmation: false,
          destination: { providerId: provider.id, providerKind: provider.kind, path: joinPath(current.directory.path, name) }
        }
      : {
          id: newId(), kind: "rename", destructive: false, requiresConfirmation: false,
          source: entry!.ref, newName: name
        };

    const failure = await runPlan([operation]);
    await refreshPane(pane);
    if (failure) setNotice(failure);
    else if (mode === "rename") clearSelection(pane);
  }

  async function confirmPendingAction(): Promise<void> {
    const pending = confirmDialog;
    setConfirmDialog(null);
    if (!pending) return;

    if (pending.kind === "move") {
      await performTransfer("move", pending.entries);
      return;
    }

    const failure = await runPlan([{
      id: newId(), kind: "delete", destructive: true, requiresConfirmation: true, source: pending.entry.ref
    }]);
    await refreshPane(pending.pane);
    if (failure) setNotice(failure);
    else clearSelection(pending.pane);
  }

  const openContextMenu = (e: React.MouseEvent, entry: FileEntry, pane: Pane) => {
    setFocusedPane(pane);
    setMenuAnchor({ element: e.currentTarget as HTMLElement, entry, pane });
  };

  const moveDestination = listingFor(focusedPane === "left" ? "right" : "left")?.directory.path;
  const deleteGoesToTrash = confirmDialog?.kind === "delete" && providerFor(confirmDialog.pane)?.kind === "desktop-filesystem";

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
            onRefresh={refresh}
            brandName={BRAND}
            isDark={isDark}
          />

          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <Box sx={{ flex: 1, p: 3, overflowY: 'auto', minHeight: 0 }}>
              {activeTab === "Explorer" && (
                <FilePane
                  pane={focusedPane}
                  currentListing={listingFor(focusedPane)}
                  currentProvider={providerFor(focusedPane)}
                  selectedEntries={focusedPane === 'left' ? selectedEntries : selectedEntriesRight}
                  loading={focusedPane === 'left' ? loadingLeft : loadingRight}
                  onSelectEntries={(e) => focusedPane === 'left' ? setSelectedEntries(e) : setSelectedEntriesRight(e)}
                  onOpenEntry={(entry, p) => {
                    const provider = providerFor(p);
                    if (entry.kind === 'directory' && provider) {
                      void browseProvider(provider, entry.ref.path, p);
                    }
                  }}
                  onNavigateTo={(path, p) => {
                    const provider = providerFor(p);
                    if (provider) void browseProvider(provider, path, p);
                  }}
                  onContextMenu={openContextMenu}
                  onNewFolder={() => setNameDialog({ mode: "create-folder", pane: focusedPane })}
                  globalError={error || paneErrors[focusedPane]}
                  focusedPane={focusedPane}
                  setFocusedPane={setFocusedPane}
                  allProviders={allProviders}
                  onSelectProvider={handleSelectProvider}
                />
              )}

              {activeTab === "Operations" && (
                <TransferHub
                  focusedPane={focusedPane}
                  setFocusedPane={setFocusedPane}
                  listing={listing}
                  listingRight={listingRight}
                  selectedProvider={selectedProviderLeft as StorageProviderDescriptor | null}
                  selectedProviderRight={selectedProviderRightActual as StorageProviderDescriptor | null}
                  selectedEntries={selectedEntries}
                  selectedEntriesRight={selectedEntriesRight}
                  loadingLeft={loadingLeft}
                  loadingRight={loadingRight}
                  onSelectEntries={(e, p) => p === 'left' ? setSelectedEntries(e) : setSelectedEntriesRight(e)}
                  onOpenEntry={(entry, p) => {
                    const provider = providerFor(p);
                    if (entry.kind === 'directory' && provider) {
                      void browseProvider(provider, entry.ref.path, p);
                    }
                  }}
                  onNavigateTo={(path, p) => {
                    const provider = providerFor(p);
                    if (provider) void browseProvider(provider, path, p);
                  }}
                  onContextMenu={openContextMenu}
                  onNewFolder={(p) => setNameDialog({ mode: "create-folder", pane: p })}
                  onExecuteTransfer={executeTransfer}
                  globalError={error}
                  paneErrors={paneErrors}
                  isTransferring={isTransferring}
                  allProviders={allProviders}
                  onSelectProvider={handleSelectProvider}
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
              selectedEntries={selectedEntries}
              selectedEntriesRight={selectedEntriesRight}
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
              const pid = menuAnchor.pane === 'left' ? selectedProviderId : selectedProviderIdRight;
              if (pid) togglePin(menuAnchor.entry, pid);
              setMenuAnchor(null);
            }}>
              <ListItemIcon><CustomIcon name="tag" size={18} /></ListItemIcon>
              {pinnedFolders.some(f => f.path === menuAnchor.entry.ref.path) ? 'Unpin from Quick Access' : 'Pin to Quick Access'}
            </MenuItem>
          )}
          <MenuItem
            disabled={!menuAnchor || !providerFor(menuAnchor.pane)?.capabilities.canRename}
            onClick={() => {
              if (menuAnchor) setNameDialog({ mode: "rename", pane: menuAnchor.pane, entry: menuAnchor.entry });
              setMenuAnchor(null);
            }}
          >
            <ListItemIcon><CustomIcon name="rename" size={18} /></ListItemIcon> Rename
          </MenuItem>
          <MenuItem
            disabled={!menuAnchor || !providerFor(menuAnchor.pane)?.capabilities.canDelete}
            onClick={() => {
              if (menuAnchor) setConfirmDialog({ kind: "delete", pane: menuAnchor.pane, entry: menuAnchor.entry });
              setMenuAnchor(null);
            }}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon><CustomIcon name="trash" size={18} sx={{ color: 'error.main' }} /></ListItemIcon> Delete
          </MenuItem>
        </Menu>

        <NameDialog
          open={Boolean(nameDialog)}
          title={nameDialog?.mode === "rename" ? "Rename" : "New Folder"}
          confirmLabel={nameDialog?.mode === "rename" ? "Rename" : "Create"}
          initialValue={nameDialog?.mode === "rename" ? nameDialog.entry?.name ?? "" : "New Folder"}
          onCancel={() => setNameDialog(null)}
          onSubmit={(name) => void submitName(name)}
        />

        <ConfirmDialog
          open={Boolean(confirmDialog)}
          title={confirmDialog?.kind === "move" ? "Move items?" : "Delete item?"}
          confirmLabel={confirmDialog?.kind === "move" ? "Move" : "Delete"}
          destructive={confirmDialog?.kind === "delete"}
          message={confirmDialog?.kind === "move"
            ? <>Move {confirmDialog.entries.length === 1 ? `"${confirmDialog.entries[0].name}"` : `${confirmDialog.entries.length} items`} to {moveDestination ?? "the other pane"}? Items that already exist there are left untouched.</>
            : confirmDialog?.kind === "delete"
              ? <>{`"${confirmDialog.entry.name}" `}{deleteGoesToTrash ? "will be moved to the Trash." : "will be permanently deleted from the device."}</>
              : null}
          onCancel={() => setConfirmDialog(null)}
          onConfirm={() => void confirmPendingAction()}
        />

        <Snackbar open={Boolean(notice)} autoHideDuration={8000} onClose={() => setNotice(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <Alert severity="error" variant="filled" onClose={() => setNotice(null)} sx={{ maxWidth: 480 }}>
            {notice}
          </Alert>
        </Snackbar>

        <SecurityDialog open={permissionDialogOpen} onClose={() => setPermissionDialogOpen(false)} />
      </ErrorBoundary>
    </ThemeProvider>
  );
}
