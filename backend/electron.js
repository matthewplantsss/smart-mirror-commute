import {
  app,
  BrowserWindow,
  dialog,
} from "electron";

import {
  startServer,
  stopServer,
} from "./server.js";

const APPLICATION_URL = "http://127.0.0.1:5050";

let mainWindow = null;
let isQuitting = false;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 950,
    minHeight: 680,
    title: "Smart Mirror Commute",
    backgroundColor: "#050a10",
    show: false,

    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.setMenuBarVisibility(false);

  await mainWindow.loadURL(APPLICATION_URL);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function launchApplication() {
  try {
    await startServer();
    await createWindow();
  } catch (error) {
    console.error(error);

    dialog.showErrorBox(
      "Smart Mirror could not start",
      error.code === "EADDRINUSE"
        ? "Port 5050 is already being used. Close any running Smart Mirror backend and reopen the app."
        : String(error.message || error)
    );

    app.quit();
  }
}

app.whenReady().then(launchApplication);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow().catch(console.error);
  }
});

app.on("before-quit", () => {
  isQuitting = true;
  stopServer().catch(console.error);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin" || isQuitting) {
    app.quit();
  }
});
