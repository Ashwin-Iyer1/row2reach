const { contextBridge } = require("electron");
const storage = require("electron-json-storage");
const path = require('path');

const configFilePath = path.join(__dirname, 'data', 'config.json');

// optional: set a custom storage folder
storage.setDataPath(path.join(__dirname, 'data'));
console.log('Storage path:', storage.getDataPath());

contextBridge.exposeInMainWorld("electronAPI", {
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
