import { app, BrowserWindow } from "electron";
import * as path from "path";
import { catchFetches } from "./hook";

function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nativeWindowOpen: true,
      contextIsolation: false,
      nodeIntegration: true,
      webSecurity: false,
    },
  });
  mainWindow.menuBarVisible = false;

  mainWindow.loadFile(path.join(__dirname, "../index.html"));

  // start hook
  const cachePath = '../overrides';
  // ignore urls with regexp
  const ignoreUrls = [
    /^https:\/\/[^.]*\.gstatic\.com\//,
    /^https:\/\/[^.]*\.google\.com\//,
    /^https:\/\/[^.]*\.googletagmanager\.com\//,
    /^https:\/\/[^.]*\.google-analytics\.com\//,
  ];
  catchFetches(mainWindow, cachePath, ignoreUrls);

  // Open the DevTools.
  mainWindow.webContents.once('devtools-opened', () => {
    // enable network.cache because we cached already.
    mainWindow.webContents.debugger.sendCommand('Network.setCacheDisabled', { cacheDisabled: false });
  });
  mainWindow.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  createWindow();

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
