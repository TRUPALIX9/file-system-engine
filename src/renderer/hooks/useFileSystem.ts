import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  DeviceInventory, 
  DirectoryListing, 
  FileEntry, 
  MountedFilesystemDescriptor,
  StorageProviderDescriptor 
} from '@shared/types';

export function useFileSystem(isMac: boolean) {
  const [inventory, setInventory] = useState<DeviceInventory | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [selectedProviderIdRight, setSelectedProviderIdRight] = useState<string | null>(null);
  const [listing, setListing] = useState<DirectoryListing | null>(null);
  const [listingRight, setListingRight] = useState<DirectoryListing | null>(null);
  const [selectedEntries, setSelectedEntries] = useState<FileEntry[]>([]);
  const [selectedEntriesRight, setSelectedEntriesRight] = useState<FileEntry[]>([]);
  const [loadingLeft, setLoadingLeft] = useState(false);
  const [loadingRight, setLoadingRight] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [hasFullDiskAccess, setHasFullDiskAccess] = useState<boolean | null>(null);
  const [hasStartedUp, setHasStartedUp] = useState(false);
  
  const [pinnedFolders, setPinnedFolders] = useState<Array<{ name: string, path: string, providerId: string }>>(() => {
    const saved = localStorage.getItem("pinned-folders");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("pinned-folders", JSON.stringify(pinnedFolders));
  }, [pinnedFolders]);

  const allDesktopProviders = useMemo(() => {
    if (!inventory) return [];
    const base = [...inventory.knownFolders, ...inventory.mountedFilesystems];
    const unique = new Map<string, MountedFilesystemDescriptor>();
    base.forEach(p => {
      const existing = unique.get(p.mountPath);
      if (!existing || p.id !== 'root') {
        let name = p.displayName;
        if (p.id === 'root') name = isMac ? "System" : "Local Disk (C:)";
        if ((name === 'Computer' || name === 'System Volume' || name === 'Macintosh HD') && p.mountPath === '/') name = 'System';
        unique.set(p.mountPath, { ...p, displayName: name });
      }
    });
    return Array.from(unique.values()).filter(p => !(p.displayName === 'Macintosh HD' && isMac));
  }, [inventory, isMac]);

  const browseProvider = useCallback(async (provider: StorageProviderDescriptor, path: string, pane: "left" | "right") => {
    const engine = (window as any).fileSystemEngine;
    if (!engine) return;

    if (pane === 'left') setLoadingLeft(true); else setLoadingRight(true);
    setError(null);

    // Safety: Ensure path is a string and not empty for IPC validation
    if (typeof path !== 'string' || path.length === 0) {
      console.warn(`useFileSystem: browseProvider called with invalid path: "${path}". Defaulting to "/". Provider:`, provider.id);
    }
    const safePath = (typeof path === 'string' && path.length > 0) ? path : '/';

    try {
      console.log(`useFileSystem: Browsing ${provider.id} at ${safePath} (pane: ${pane})`);
      const result = await engine.storage.browse({ 
        location: { providerId: provider.id, providerKind: provider.kind, path: safePath },
        includeHidden: false 
      });

      if (pane === 'left') setLoadingLeft(false); else setLoadingRight(false);

      if (result.ok) {
        if (pane === 'left') setListing(result.data.listing);
        else setListingRight(result.data.listing);
      } else {
        setError(result.error.message);
      }
    } catch (e: any) {
      if (pane === 'left') setLoadingLeft(false); else setLoadingRight(false);
      setError(e.message || "Failed to browse location");
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoadState("loading");
    const engine = (window as any).fileSystemEngine;
    if (!engine) {
      setError("Native engine not found.");
      setLoadState("error");
      return;
    }

    if (isMac) {
      const checkResult = await engine.storage.browse({ 
        location: { providerId: 'root', providerKind: 'desktop-filesystem', path: '/Library/Application Support/com.apple.TCC' },
        includeHidden: false 
      });
      setHasFullDiskAccess(checkResult.ok);
    }

    const devicesResult = await engine.devices.list();
    if (devicesResult.ok) {
      setInventory(devicesResult.data);
      setLoadState("ready");
    } else {
      setError(devicesResult.error.message);
      setLoadState("error");
    }
  }, [isMac]);

  useEffect(() => {
    void refresh();

    const engine = (window as any).fileSystemEngine;
    if (engine?.devices?.onUpdated) {
      return engine.devices.onUpdated((newInventory: DeviceInventory) => {
        setInventory(newInventory);
      });
    }
  }, [refresh]);

  const togglePin = (entry: FileEntry, providerId: string) => {
    if (entry.kind !== 'directory') return;
    const isPinned = pinnedFolders.some(f => f.path === entry.ref.path && f.providerId === providerId);
    if (isPinned) {
      setPinnedFolders(prev => prev.filter(f => !(f.path === entry.ref.path && f.providerId === providerId)));
    } else {
      setPinnedFolders(prev => [...prev, { name: entry.name, path: entry.ref.path, providerId }]);
    }
  };

  return {
    inventory,
    allDesktopProviders,
    allProviders: inventory ? [...allDesktopProviders, ...(inventory.androidDevices || [])] : [],
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
    setError,
    loadState,
    hasFullDiskAccess,
    hasStartedUp,
    setHasStartedUp,
    pinnedFolders,
    browseProvider,
    refresh,
    togglePin
  };
}
