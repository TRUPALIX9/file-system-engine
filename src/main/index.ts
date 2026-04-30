import { app, BrowserWindow, session } from "electron";
import { createMainWindow } from "./app/createWindow";
import { registerIpcHandlers } from "./app/registerIpc";

if (!app.requestSingleInstanceLock()) {
  console.log("Main process: Another instance is already running. Exiting.");
  app.quit();
  process.exit(0);
}

app.disableHardwareAcceleration();

process.on("uncaughtException", (error) => {
  console.error("CRITICAL: Uncaught Exception in Main Process:");
  console.error(error);
});

process.on("unhandledRejection", (reason) => {
  console.error("CRITICAL: Unhandled Rejection in Main Process:");
  console.error(reason);
});

app.whenReady().then(() => {
  console.log("Main process: App is ready, registering handlers...");
  registerIpcHandlers();

  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  console.log("Main process: Creating main window...");
  let mainWindow: BrowserWindow | null = createMainWindow();

  if (!mainWindow) {
    console.error("Main process: Failed to create main window!");
    app.quit();
    return;
  }

  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isDestroyed()) {
        mainWindow = createMainWindow();
      } else {
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.focus();
      }
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

