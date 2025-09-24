const { contextBridge } = require("electron");
const storage = require("electron-json-storage");

// optional: set a custom storage folder
storage.setDataPath(__dirname + '/extraResources/');
console.log('Storage path:', storage.getDataPath());

contextBridge.exposeInMainWorld("electronAPI", {
  getKeys: () =>
    new Promise((resolve, reject) => {
      storage.get("userKeys", (error, data) => {
        if (error) reject(error);
        else resolve(data);
      });
    }),

  saveKeys: (keys) =>
    new Promise((resolve, reject) => {
      storage.set("userKeys", keys, (error) => {
        if (error) reject(error);
        else resolve();
      });
    }),
});
