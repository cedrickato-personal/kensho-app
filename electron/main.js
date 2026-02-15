const { app, BrowserWindow, globalShortcut, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { createTray } = require("./tray");

// Persist window bounds between sessions
const BOUNDS_FILE = path.join(app.getPath("userData"), "window-bounds.json");

function loadBounds() {
  try {
    if (fs.existsSync(BOUNDS_FILE)) {
      return JSON.parse(fs.readFileSync(BOUNDS_FILE, "utf-8"));
    }
  } catch {}
  return { width: 460, height: 820 };
}

function saveBounds(win) {
  try {
    const bounds = win.getBounds();
    fs.writeFileSync(BOUNDS_FILE, JSON.stringify(bounds));
  } catch {}
}

// Persist settings (always-on-top, auto-start)
const SETTINGS_FILE = path.join(app.getPath("userData"), "settings.json");

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
    }
  } catch {}
  return { alwaysOnTop: false, autoStart: false };
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings));
  } catch {}
}

let mainWindow = null;
let tray = null;
let settings = loadSettings();

const isDev = !app.isPackaged;

function createWindow() {
  const bounds = loadBounds();

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 380,
    minHeight: 600,
    title: "KENSHO Tracker",
    backgroundColor: "#030712",
    icon: path.join(__dirname, "..", "public", "icon.png"),
    alwaysOnTop: settings.alwaysOnTop,
    frame: false,
    titleBarStyle: "hidden",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Remove the application menu entirely
  mainWindow.setMenu(null);

  // Window control IPC handlers
  ipcMain.on("window-minimize", () => mainWindow.minimize());
  ipcMain.on("window-maximize", () => {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  ipcMain.on("window-close", () => mainWindow.close());

  // Load the app
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  // Save window bounds on move/resize
  mainWindow.on("resize", () => saveBounds(mainWindow));
  mainWindow.on("move", () => saveBounds(mainWindow));

  // Hide to tray instead of closing
  mainWindow.on("close", (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  // Create system tray
  tray = createTray(mainWindow, settings, {
    onToggleAlwaysOnTop: () => {
      settings.alwaysOnTop = !settings.alwaysOnTop;
      mainWindow.setAlwaysOnTop(settings.alwaysOnTop);
      saveSettings(settings);
    },
    onToggleAutoStart: () => {
      settings.autoStart = !settings.autoStart;
      app.setLoginItemSettings({
        openAtLogin: settings.autoStart,
        path: app.getPath("exe"),
      });
      saveSettings(settings);
    },
    onQuit: () => {
      app.isQuitting = true;
      app.quit();
    },
  });

  // Apply auto-start setting
  app.setLoginItemSettings({
    openAtLogin: settings.autoStart,
    path: app.getPath("exe"),
  });
}

app.whenReady().then(() => {
  createWindow();

  // Global shortcut: Ctrl+Shift+T toggles always-on-top
  globalShortcut.register("Ctrl+Shift+T", () => {
    if (mainWindow) {
      settings.alwaysOnTop = !settings.alwaysOnTop;
      mainWindow.setAlwaysOnTop(settings.alwaysOnTop);
      saveSettings(settings);
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow.show();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    // Don't quit — tray keeps it alive
  }
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("before-quit", () => {
  app.isQuitting = true;
});
