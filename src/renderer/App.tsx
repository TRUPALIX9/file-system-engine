import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  Copy,
  Database,
  Download,
  Edit3,
  ExternalLink,
  FileSearch,
  FolderPlus,
  FolderOpen,
  HardDrive,
  MoveRight,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tags,
  Trash2
} from "lucide-react";
import { APP_NAME, PRODUCT_COPY } from "@shared/constants/app";
import type {
  DeviceInventory,
  DirectoryListing,
  FileEntry,
  FileOperation,
  LlmProviderStatus,
  MountedFilesystemDescriptor,
  StorageAnalysisResult
} from "@shared/index";
import { getFileSystemEngineApi } from "./api/fileSystemEngineClient";

type LoadState = "idle" | "loading" | "ready" | "error";
type FileSortMode = "largest" | "smallest";

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

function joinChildPath(parent: string, child: string): string {
  const separator = parent.includes("\\") ? "\\" : "/";
  return parent.endsWith("/") || parent.endsWith("\\") ? `${parent}${child}` : `${parent}${separator}${child}`;
}

function parentPath(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const index = normalized.lastIndexOf("/");

  if (index <= 0) {
    return path.includes("\\") ? path.slice(0, 3) : "/";
  }

  return path.slice(0, index);
}

export function App(): ReactElement {
  const [inventory, setInventory] = useState<DeviceInventory | null>(null);
  const [aiStatus, setAiStatus] = useState<LlmProviderStatus | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<FileEntry | null>(null);
  const [listing, setListing] = useState<DirectoryListing | null>(null);
  const [analysis, setAnalysis] = useState<StorageAnalysisResult | null>(null);
  const [analysisState, setAnalysisState] = useState<LoadState>("idle");
  const [analysisQuery, setAnalysisQuery] = useState("");
  const [fileSortMode, setFileSortMode] = useState<FileSortMode>("largest");
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);

  const allDesktopProviders = useMemo(
    () => [...(inventory?.knownFolders ?? []), ...(inventory?.mountedFilesystems ?? [])],
    [inventory?.knownFolders, inventory?.mountedFilesystems]
  );

  const selectedProvider = useMemo(
    () => allDesktopProviders.find((provider) => provider.id === selectedProviderId) ?? null,
    [allDesktopProviders, selectedProviderId]
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
      [
        ...devicesResult.data.knownFolders,
        ...devicesResult.data.mountedFilesystems
      ].find((provider) => provider.id === selectedProviderId) ??
      devicesResult.data.knownFolders.find((provider) => provider.displayName === "Downloads") ??
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
    setSelectedEntry(null);
    setAnalysis(null);
    setError(null);
    await browseProvider(provider);
  }

  async function openEntry(entry: FileEntry): Promise<void> {
    if (entry.kind !== "directory" || !selectedProvider) {
      return;
    }

    setError(null);
    setSelectedEntry(null);
    await browseProvider(selectedProvider, entry.ref.path);
  }

  async function executeOperations(operations: FileOperation[], confirmed: boolean): Promise<void> {
    const result = await fileSystemEngine.operations.executePlan({
      planId: crypto.randomUUID(),
      operations,
      confirmed
    });

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    const failed = result.data.logs.find((log) => log.status === "failed");

    if (failed) {
      setError(failed.errorMessage ?? "File operation failed.");
      return;
    }

    if (selectedProvider && listing) {
      await browseProvider(selectedProvider, listing.directory.path);
    }

    setSelectedEntry(null);
    setError(null);
  }

  async function createFolder(): Promise<void> {
    if (!selectedProvider || !listing) {
      return;
    }

    const name = window.prompt("Folder name");

    if (!name) {
      return;
    }

    await executeOperations(
      [
        {
          id: crypto.randomUUID(),
          kind: "create-folder",
          destination: {
            providerId: selectedProvider.id,
            providerKind: "desktop-filesystem",
            path: joinChildPath(listing.directory.path, name)
          },
          destructive: false,
          requiresConfirmation: false
        }
      ],
      true
    );
  }

  async function renameSelected(): Promise<void> {
    if (!selectedEntry) {
      return;
    }

    const newName = window.prompt("New name", selectedEntry.name);

    if (!newName || newName === selectedEntry.name) {
      return;
    }

    await executeOperations(
      [
        {
          id: crypto.randomUUID(),
          kind: "rename",
          source: selectedEntry.ref,
          newName,
          destructive: false,
          requiresConfirmation: true
        }
      ],
      window.confirm(`Rename ${selectedEntry.name}?`)
    );
  }

  async function deleteSelected(): Promise<void> {
    if (!selectedEntry) {
      return;
    }

    await executeOperations(
      [
        {
          id: crypto.randomUUID(),
          kind: "delete",
          source: selectedEntry.ref,
          destructive: true,
          requiresConfirmation: true
        }
      ],
      window.confirm(`Move ${selectedEntry.name} to Trash?`)
    );
  }

  async function copySelected(): Promise<void> {
    if (!selectedProvider || !selectedEntry) {
      return;
    }

    const defaultPath = joinChildPath(parentPath(selectedEntry.ref.path), `${selectedEntry.name} copy`);
    const destinationPath = window.prompt("Copy destination path", defaultPath);

    if (!destinationPath) {
      return;
    }

    await executeOperations(
      [
        {
          id: crypto.randomUUID(),
          kind: "copy",
          source: selectedEntry.ref,
          destination: {
            providerId: selectedProvider.id,
            providerKind: "desktop-filesystem",
            path: destinationPath
          },
          destructive: false,
          requiresConfirmation: true
        }
      ],
      window.confirm(`Copy ${selectedEntry.name}?`)
    );
  }

  async function moveSelected(): Promise<void> {
    if (!selectedProvider || !selectedEntry) {
      return;
    }

    const destinationPath = window.prompt("Move destination path", selectedEntry.ref.path);

    if (!destinationPath || destinationPath === selectedEntry.ref.path) {
      return;
    }

    await executeOperations(
      [
        {
          id: crypto.randomUUID(),
          kind: "move",
          source: selectedEntry.ref,
          destination: {
            providerId: selectedProvider.id,
            providerKind: "desktop-filesystem",
            path: destinationPath
          },
          destructive: true,
          requiresConfirmation: true
        }
      ],
      window.confirm(`Move ${selectedEntry.name}?`)
    );
  }

  async function tagSelected(): Promise<void> {
    if (!selectedEntry) {
      return;
    }

    const currentTags = selectedEntry.metadata.tags?.join(", ") ?? "";
    const tagText = window.prompt("macOS Finder tags, separated by commas", currentTags);

    if (tagText === null) {
      return;
    }

    await executeOperations(
      [
        {
          id: crypto.randomUUID(),
          kind: "set-tags",
          source: selectedEntry.ref,
          tags: tagText
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          destructive: false,
          requiresConfirmation: false
        }
      ],
      true
    );
  }

  async function analyzeCurrentFolder(): Promise<void> {
    if (!selectedProvider || !listing) {
      return;
    }

    setAnalysisState("loading");
    setError(null);
    const result = await fileSystemEngine.storage.analyze({
      root: {
        providerId: selectedProvider.id,
        providerKind: "desktop-filesystem",
        path: listing.directory.path
      },
      includeHidden: false,
      maxEntries: 25000,
      maxDepth: 8,
      query: analysisQuery.trim() || undefined
    });

    if (!result.ok) {
      setAnalysisState("error");
      setError(result.error.message);
      return;
    }

    setAnalysis(result.data);
    setAnalysisState("ready");
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

        <section className="sidebar-section" aria-labelledby="folders-heading">
          <h2 id="folders-heading">Folder workspaces</h2>
          {(inventory?.knownFolders.length ?? 0) > 0 ? (
            <div className="device-list">
              {inventory?.knownFolders.map((provider) => (
                <button
                  className={`device-row ${provider.id === selectedProviderId ? "selected" : ""}`}
                  key={provider.id}
                  type="button"
                  onClick={() => void selectProvider(provider)}
                >
                  {provider.displayName === "Downloads" ? <Download size={18} /> : <FolderOpen size={18} />}
                  <span>{provider.displayName}</span>
                  <small>{provider.accessState}</small>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-device-row">
              <FolderOpen size={18} />
              <span>No folders</span>
            </div>
          )}
        </section>

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

          <div className="action-toolbar" aria-label="File actions">
            <button type="button" onClick={() => void createFolder()} disabled={!selectedProvider}>
              <FolderPlus size={16} />
              <span>Folder</span>
            </button>
            <button type="button" onClick={() => void renameSelected()} disabled={!selectedEntry}>
              <Edit3 size={16} />
              <span>Rename</span>
            </button>
            <button type="button" onClick={() => void copySelected()} disabled={!selectedEntry}>
              <Copy size={16} />
              <span>Copy</span>
            </button>
            <button type="button" onClick={() => void moveSelected()} disabled={!selectedEntry}>
              <MoveRight size={16} />
              <span>Move</span>
            </button>
            <button type="button" onClick={() => void deleteSelected()} disabled={!selectedEntry}>
              <Trash2 size={16} />
              <span>Delete</span>
            </button>
            <button type="button" onClick={() => void tagSelected()} disabled={!selectedEntry}>
              <Tags size={16} />
              <span>Tags</span>
            </button>
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
                    className={`table-row file-row ${selectedEntry?.ref.path === entry.ref.path ? "selected" : ""}`}
                    key={entry.ref.path}
                    type="button"
                    onDoubleClick={() => void openEntry(entry)}
                    onClick={() => setSelectedEntry(entry)}
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

        <section className="browser-surface analyzer-surface" aria-labelledby="analyzer-heading">
          <div className="surface-header">
            <div>
              <h3 id="analyzer-heading">Storage analyzer</h3>
              <p>Find cleanup candidates, largest files, folder weight, and redundant-looking files.</p>
            </div>
            <span className={`status-pill ${analysisState}`}>
              <BarChart3 size={15} />
              {analysisState}
            </span>
          </div>
          <div className="analyzer-controls">
            <label className="search-field">
              <Search size={16} />
              <input
                value={analysisQuery}
                onChange={(event) => setAnalysisQuery(event.target.value)}
                placeholder="Filter names or extensions"
              />
            </label>
            <button type="button" onClick={() => void analyzeCurrentFolder()} disabled={!selectedProvider}>
              <BarChart3 size={16} />
              <span>Analyze folder</span>
            </button>
            <button
              className={fileSortMode === "largest" ? "active" : ""}
              type="button"
              onClick={() => setFileSortMode("largest")}
            >
              Largest
            </button>
            <button
              className={fileSortMode === "smallest" ? "active" : ""}
              type="button"
              onClick={() => setFileSortMode("smallest")}
            >
              Smallest
            </button>
          </div>

          {analysis ? (
            <div className="analysis-grid">
              <article className="analysis-summary">
                <strong>{formatBytes(analysis.totalBytes)}</strong>
                <span>{analysis.fileCount} files</span>
                <span>{analysis.directoryCount} folders</span>
                {analysis.truncated ? <em>Scan capped at requested limit</em> : null}
              </article>

              <article className="treemap" aria-label="Folder size chart">
                {analysis.treemapItems.length > 0 ? (
                  analysis.treemapItems.map((item) => (
                    <div
                      className="treemap-tile"
                      key={item.id}
                      style={{
                        backgroundColor: item.color,
                        flexBasis: `${Math.max(16, (item.sizeBytes / Math.max(analysis.totalBytes, 1)) * 100)}%`
                      }}
                      title={`${item.label}: ${formatBytes(item.sizeBytes)}`}
                    >
                      <span>{item.label}</span>
                      <strong>{formatBytes(item.sizeBytes)}</strong>
                    </div>
                  ))
                ) : (
                  <div className="chart-empty">No folder chart data yet</div>
                )}
              </article>

              <article className="analysis-list">
                <h4>{fileSortMode === "largest" ? "Largest files" : "Smallest files"}</h4>
                {(fileSortMode === "largest" ? analysis.largestFiles : analysis.smallestFiles)
                  .slice(0, 12)
                  .map((file) => (
                    <button className="analysis-row" key={file.ref.path} type="button" onClick={() => setSelectedEntry(file)}>
                      <span>{file.name}</span>
                      <strong>{formatBytes(file.metadata.sizeBytes)}</strong>
                    </button>
                  ))}
              </article>

              <article className="analysis-list">
                <h4>Extension chart</h4>
                {analysis.extensionBreakdown.slice(0, 8).map((item) => (
                  <div className="bar-row" key={item.extension}>
                    <span>{item.extension}</span>
                    <div>
                      <i style={{ width: `${(item.sizeBytes / Math.max(analysis.totalBytes, 1)) * 100}%` }} />
                    </div>
                    <strong>{formatBytes(item.sizeBytes)}</strong>
                  </div>
                ))}
              </article>

              <article className="analysis-list">
                <h4>Redundant candidates</h4>
                {analysis.redundantCandidates.length > 0 ? (
                  analysis.redundantCandidates.slice(0, 6).map((candidate) => (
                    <div className="candidate-row" key={candidate.files.map((file) => file.ref.path).join("|")}>
                      <span>{candidate.files.length} similar files</span>
                      <strong>{Math.round(candidate.confidence * 100)}%</strong>
                    </div>
                  ))
                ) : (
                  <p>No same-name-and-size candidates found.</p>
                )}
              </article>
            </div>
          ) : (
            <div className="table-empty compact">
              <BarChart3 size={28} />
              <strong>No analysis yet</strong>
              <span>Choose Downloads or another folder, then analyze it.</span>
            </div>
          )}
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
                {warning.helpUrl ? (() => {
                  const helpUrl = warning.helpUrl;

                  return (
                  <button
                    className="link-button"
                    type="button"
                    onClick={() => void fileSystemEngine.app.openExternal({ url: helpUrl })}
                  >
                    <ExternalLink size={14} />
                    <span>Install driver</span>
                  </button>
                  );
                })() : null}
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
            <Tags size={18} />
            <h2>macOS tags</h2>
          </div>
          {selectedEntry?.metadata.tags && selectedEntry.metadata.tags.length > 0 ? (
            <div className="tag-list">
              {selectedEntry.metadata.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          ) : (
            <p>Finder tags are read from macOS metadata when available.</p>
          )}
        </section>

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
