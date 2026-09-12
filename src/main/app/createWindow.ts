import { app, BrowserWindow, shell } from "electron";
import { join } from "node:path";

export function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1080,
    minHeight: 720,
    title: "File System Engine",
    icon: join(app.getAppPath(), "public/logos/fse-app-icon-master.svg"),
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
    if (url.startsWith("https://") || url.startsWith("x-apple.systempreferences:")) {
      void shell.openExternal(url);
    }

    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    // Only prevent navigation to external web URLs
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("x-apple.systempreferences:")) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  if (devServerUrl) {
    mainWindow.webContents.openDevTools();
    void mainWindow.loadURL(devServerUrl);
  } else {
    // DevTools stay closed in packaged builds; an unpackaged `npm start` still gets them.
    if (!app.isPackaged) {
      mainWindow.webContents.openDevTools();
    }
    void mainWindow.loadFile(join(app.getAppPath(), "dist/renderer/index.html"));
  }

  return mainWindow;
}
