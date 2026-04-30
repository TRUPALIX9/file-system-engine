import { app, BrowserWindow, session } from "electron";
import { createMainWindow } from "./app/createWindow";
import { registerIpcHandlers } from "./app/registerIpc";

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

app.disableHardwareAcceleration();

app.whenReady().then(() => {
  registerIpcHandlers();

  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  const mainWindow = createMainWindow();

  app.on("second-instance", () => {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }

    mainWindow.focus();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

