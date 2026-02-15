const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("kensho", {
  platform: process.platform,
  isElectron: true,
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),
});
