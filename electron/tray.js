const { Tray, Menu, nativeImage } = require("electron");
const path = require("path");

function createTray(mainWindow, settings, callbacks) {
  // Create tray icon
  const iconPath = path.join(__dirname, "..", "public", "icon.png");
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } catch {
    // Fallback: empty icon if file missing
    trayIcon = nativeImage.createEmpty();
  }

  const tray = new Tray(trayIcon);
  tray.setToolTip("KENSHO Tracker");

  function updateContextMenu() {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Show KENSHO",
        click: () => {
          mainWindow.show();
          mainWindow.focus();
        },
      },
      { type: "separator" },
      {
        label: "Always on Top",
        type: "checkbox",
        checked: settings.alwaysOnTop,
        click: () => {
          callbacks.onToggleAlwaysOnTop();
          updateContextMenu();
        },
      },
      {
        label: "Start with Windows",
        type: "checkbox",
        checked: settings.autoStart,
        click: () => {
          callbacks.onToggleAutoStart();
          updateContextMenu();
        },
      },
      { type: "separator" },
      {
        label: "Quit KENSHO",
        click: () => callbacks.onQuit(),
      },
    ]);

    tray.setContextMenu(contextMenu);
  }

  updateContextMenu();

  // Single-click tray icon: toggle window visibility
  tray.on("click", () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  return tray;
}

module.exports = { createTray };
