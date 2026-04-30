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
import type { DeviceInventory, LlmProviderStatus } from "@shared/index";
import { getFileSystemEngineApi } from "./api/fileSystemEngineClient";

type LoadState = "idle" | "loading" | "ready" | "error";

const shellStats = [
  { label: "Mounted providers", value: "0", icon: HardDrive },
  { label: "Android providers", value: "0", icon: Smartphone },
  { label: "Scan jobs", value: "0", icon: FileSearch },
  { label: "AI runtime", value: "Offline", icon: Bot }
];

const fileSystemEngine = getFileSystemEngineApi();

export function App(): ReactElement {
  const [inventory, setInventory] = useState<DeviceInventory | null>(null);
  const [aiStatus, setAiStatus] = useState<LlmProviderStatus | null>(null);
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);

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
    setState("ready");
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
          <div className="empty-device-row">
            <HardDrive size={18} />
            <span>{inventory?.mountedFilesystems.length ?? 0} connected</span>
          </div>
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
            <p className="eyebrow">Phase 4</p>
            <h2>Electron App Shell</h2>
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
              <p>{state === "loading" ? "Refreshing provider inventory" : "Ready for providers"}</p>
            </div>
            <span className={`status-pill ${state}`}>
              {state === "error" ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
              {state}
            </span>
          </div>

          <div className="table-shell">
            <div className="table-row table-head">
              <span>Name</span>
              <span>Type</span>
              <span>Access</span>
              <span>Last seen</span>
            </div>
            <div className="table-empty">
              <FolderOpen size={28} />
              <strong>No storage providers loaded</strong>
              <span>Drive and Android provider services connect in the next implementation phases.</span>
            </div>
          </div>
        </section>
      </section>

      <aside className="details-panel">
        <section className="detail-block">
          <div className="detail-title">
            <ShieldCheck size={18} />
            <h2>Security boundary</h2>
          </div>
          <ul>
            <li>contextIsolation enabled</li>
            <li>nodeIntegration disabled</li>
            <li>typed preload API only</li>
            <li>permission prompts denied by default</li>
          </ul>
        </section>

        <section className="detail-block">
          <div className="detail-title">
            <HardDrive size={18} />
            <h2>NTFS rule</h2>
          </div>
          <p>{PRODUCT_COPY.ntfsReadOnly}</p>
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
