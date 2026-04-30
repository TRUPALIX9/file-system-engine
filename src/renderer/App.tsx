import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Database,
  FileSearch,
  FolderOpen,
  HardDrive,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles
} from "lucide-react";
import { APP_NAME, PRODUCT_COPY } from "@shared/constants/app";
import type {
  DeviceInventory,
  DirectoryListing,
  FileEntry,
  LlmProviderStatus,
  MountedFilesystemDescriptor
} from "@shared/index";
import { getFileSystemEngineApi } from "./api/fileSystemEngineClient";

type LoadState = "idle" | "loading" | "ready" | "error";

const shellStats = [
  { label: "Mounted providers", value: "0", icon: HardDrive },
  { label: "Android providers", value: "0", icon: Smartphone },
  { label: "Scan jobs", value: "0", icon: FileSearch },
  { label: "AI runtime", value: "Offline", icon: Bot }
];

const fileSystemEngine = getFileSystemEngineApi();

function formatBytes(bytes?: number): string {
  if (bytes === undefined) {
    return "-";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatFilesystem(value: string): string {
  return value
    .split("-")
    .map((part) => part.toUpperCase())
    .join(" ");
}

function formatDate(value?: string): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function App(): ReactElement {
  const [inventory, setInventory] = useState<DeviceInventory | null>(null);
  const [aiStatus, setAiStatus] = useState<LlmProviderStatus | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [listing, setListing] = useState<DirectoryListing | null>(null);
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);

  const selectedProvider = useMemo(
    () =>
      inventory?.mountedFilesystems.find((provider) => provider.id === selectedProviderId) ?? null,
    [inventory?.mountedFilesystems, selectedProviderId]
  );

  const stats = useMemo(
    () =>
      shellStats.map((item) => {
        if (item.label === "Mounted providers") {
          return { ...item, value: String(inventory?.mountedFilesystems.length ?? 0) };
        }

        if (item.label === "Android providers") {
          return { ...item, value: String(inventory?.androidDevices.length ?? 0) };
        }

        if (item.label === "AI runtime") {
          return {
            ...item,
            value: aiStatus?.availability === "available" ? "Ready" : "Offline"
          };
        }

        return item;
      }),
    [aiStatus?.availability, inventory?.androidDevices.length, inventory?.mountedFilesystems.length]
  );

  async function browseProvider(provider: MountedFilesystemDescriptor, path = provider.mountPath): Promise<void> {
    const result = await fileSystemEngine.storage.browse({
      location: {
        providerId: provider.id,
        providerKind: "desktop-filesystem",
        path
      },
      includeHidden: false
    });

    if (!result.ok) {
      setError(result.error.message);
      setListing(null);
      return;
    }

    setListing(result.data.listing);
  }

  async function refresh(): Promise<void> {
    setState("loading");
    setError(null);

    const [devicesResult, aiResult] = await Promise.all([
      fileSystemEngine.devices.list(),
      fileSystemEngine.ai.status()
    ]);

    if (!devicesResult.ok) {
      setState("error");
      setError(devicesResult.error.message);
      return;
    }

    if (!aiResult.ok) {
      setState("error");
      setError(aiResult.error.message);
      return;
    }

    setInventory(devicesResult.data);
    setAiStatus(aiResult.data);
    const nextProvider =
      devicesResult.data.mountedFilesystems.find((provider) => provider.id === selectedProviderId) ??
      devicesResult.data.mountedFilesystems[0] ??
      null;

    setSelectedProviderId(nextProvider?.id ?? null);

    if (nextProvider) {
      await browseProvider(nextProvider);
    } else {
      setListing(null);
    }

    setState("ready");
  }

  async function selectProvider(provider: MountedFilesystemDescriptor): Promise<void> {
    setSelectedProviderId(provider.id);
    setError(null);
    await browseProvider(provider);
  }

  async function openEntry(entry: FileEntry): Promise<void> {
    if (entry.kind !== "directory" || !selectedProvider) {
      return;
    }

    setError(null);
    await browseProvider(selectedProvider, entry.ref.path);
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">
            <FolderOpen size={22} strokeWidth={2.2} />
          </div>
          <div>
            <h1>{APP_NAME}</h1>
            <p>Storage workspace</p>
          </div>
        </div>

        <nav className="nav-list" aria-label="Storage sections">
          <button className="nav-item active" type="button">
            <HardDrive size={18} />
            <span>Devices</span>
          </button>
          <button className="nav-item" type="button">
            <FileSearch size={18} />
            <span>Scans</span>
          </button>
          <button className="nav-item" type="button">
            <Sparkles size={18} />
            <span>Suggestions</span>
          </button>
          <button className="nav-item" type="button">
            <Database size={18} />
            <span>Records</span>
          </button>
        </nav>

        <section className="sidebar-section" aria-labelledby="mounted-heading">
          <h2 id="mounted-heading">Mounted filesystems</h2>
          {(inventory?.mountedFilesystems.length ?? 0) > 0 ? (
            <div className="device-list">
              {inventory?.mountedFilesystems.map((provider) => (
                <button
                  className={`device-row ${provider.id === selectedProviderId ? "selected" : ""}`}
                  key={provider.id}
                  type="button"
                  onClick={() => void selectProvider(provider)}
                >
                  <HardDrive size={18} />
                  <span>{provider.displayName}</span>
                  <small>{formatFilesystem(provider.filesystemType)}</small>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-device-row">
              <HardDrive size={18} />
              <span>0 connected</span>
            </div>
          )}
        </section>

        <section className="sidebar-section" aria-labelledby="android-heading">
          <h2 id="android-heading">Android devices</h2>
          <div className="empty-device-row">
            <Smartphone size={18} />
            <span>{inventory?.androidDevices.length ?? 0} connected</span>
          </div>
        </section>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Phase 5 + 6</p>
            <h2>IPC and Desktop Filesystems</h2>
          </div>
          <button className="icon-button" type="button" onClick={() => void refresh()} title="Refresh">
            <RefreshCw size={18} />
          </button>
        </header>

        <section className="stats-grid" aria-label="Workspace status">
          {stats.map((item) => (
            <article className="stat-card" key={item.label}>
              <item.icon size={19} />
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </article>
          ))}
        </section>

        <section className="browser-surface" aria-labelledby="browser-heading">
          <div className="surface-header">
            <div>
              <h3 id="browser-heading">Provider browser</h3>
              <p>
                {listing
                  ? listing.directory.path
                  : state === "loading"
                    ? "Refreshing provider inventory"
                    : "Select a mounted filesystem"}
              </p>
            </div>
            <span className={`status-pill ${state}`}>
              {state === "error" ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
              {state}
            </span>
          </div>

          <div className="table-shell">
            <div className="table-row table-head">
              <span>Name</span>
              <span>Kind</span>
              <span>Size</span>
              <span>Modified</span>
            </div>
            {listing && listing.entries.length > 0 ? (
              <div className="file-list">
                {listing.entries.map((entry) => (
                  <button
                    className="table-row file-row"
                    key={entry.ref.path}
                    type="button"
                    onClick={() => void openEntry(entry)}
                    disabled={entry.kind !== "directory"}
                    title={entry.name}
                  >
                    <span className="file-name">
                      {entry.kind === "directory" ? <FolderOpen size={16} /> : <FileSearch size={16} />}
                      {entry.name}
                    </span>
                    <span>{entry.kind}</span>
                    <span>{formatBytes(entry.metadata.sizeBytes)}</span>
                    <span>{formatDate(entry.metadata.modifiedAt)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="table-empty">
                <FolderOpen size={28} />
                <strong>{selectedProvider ? "This location is empty" : "No storage providers loaded"}</strong>
                <span>
                  {selectedProvider
                    ? "Hidden files are currently filtered from this listing."
                    : "Run inside Electron to load real mounted filesystem providers."}
                </span>
              </div>
            )}
          </div>
        </section>
      </section>

      <aside className="details-panel">
        <section className="detail-block">
          <div className="detail-title">
            <ShieldCheck size={18} />
            <h2>IPC boundary</h2>
          </div>
          <ul>
            <li>Runtime payload validation</li>
            <li>Typed preload API only</li>
            <li>Provider-scoped browse requests</li>
            <li>Renderer has no Node access</li>
          </ul>
        </section>

        {selectedProvider ? (
          <section className="detail-block">
            <div className="detail-title">
              <HardDrive size={18} />
              <h2>{selectedProvider.displayName}</h2>
            </div>
            <dl className="provider-facts">
              <div>
                <dt>Filesystem</dt>
                <dd>{formatFilesystem(selectedProvider.filesystemType)}</dd>
              </div>
              <div>
                <dt>Access</dt>
                <dd>{selectedProvider.accessState}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>{formatBytes(selectedProvider.usage.totalBytes)}</dd>
              </div>
              <div>
                <dt>Free</dt>
                <dd>{formatBytes(selectedProvider.usage.availableBytes)}</dd>
              </div>
            </dl>
            {selectedProvider.warnings.map((warning) => (
              <p className="warning-note" key={warning.code}>
                {warning.message}
              </p>
            ))}
          </section>
        ) : (
          <section className="detail-block">
            <div className="detail-title">
              <HardDrive size={18} />
              <h2>NTFS rule</h2>
            </div>
            <p>{PRODUCT_COPY.ntfsReadOnly}</p>
          </section>
        )}

        <section className="detail-block">
          <div className="detail-title">
            <Smartphone size={18} />
            <h2>Android rule</h2>
          </div>
          <p>{PRODUCT_COPY.androidUnauthorized}</p>
        </section>

        {error ? <p className="error-note">{error}</p> : null}
      </aside>
    </main>
  );
}
