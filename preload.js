const { contextBridge, ipcRenderer } = require("electron");
const storage = require("electron-json-storage");
const path = require("path");

contextBridge.exposeInMainWorld("electronAPI", {
  navigateTo: (page) => ipcRenderer.send("navigate-to", page),
  sendLoginMessage: () => {
    ipcRenderer.send("LOGIN");
  },
  sendMessage: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  onHideButton: (callback) => ipcRenderer.on('hide-button-message', callback),

  getKeys: () =>
    new Promise((resolve, reject) => {
      storage.get("config", (error, data) => {
        if (error) reject(error);
        else resolve(data);
      });
    }),

  saveKeys: (keys) =>
    new Promise((resolve, reject) => {
      storage.set("config", keys, (error) => {
        if (error) reject(error);
        else resolve();
      });
    }),
});
