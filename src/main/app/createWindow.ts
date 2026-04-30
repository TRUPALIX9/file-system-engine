import { app, BrowserWindow, shell } from "electron";
import { join } from "node:path";

export function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1080,
    minHeight: 720,
    title: "File System Engine",
    backgroundColor: "#f6f7f9",
    show: false,
    webPreferences: {
      preload: join(app.getAppPath(), "dist/preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) {
      void shell.openExternal(url);
    }

    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    const currentUrl = mainWindow.webContents.getURL();

    if (url !== currentUrl) {
      event.preventDefault();
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  if (devServerUrl) {
    void mainWindow.loadURL(devServerUrl);
  } else {
    void mainWindow.loadFile(join(app.getAppPath(), "dist/renderer/index.html"));
  }

  return mainWindow;
}
