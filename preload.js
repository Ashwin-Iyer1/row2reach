const { contextBridge, ipcRenderer, app } = require("electron");
const storage = require("electron-json-storage");
const path = require("path");
const os = require("os");

// Set storage path explicitly
const userDataPath = path.join(os.homedir(), ".row2reach");
storage.setDataPath(userDataPath);

contextBridge.exposeInMainWorld("electronAPI", {
  navigateTo: (page) => ipcRenderer.send("navigate-to", page),
  sendLoginMessage: () => {
    ipcRenderer.send("LOGIN");
  },
  sendMessage: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  onHideButton: (callback) => ipcRenderer.on("hide-button-message", callback),

  saveCsvFile: (csvContent, defaultFileName) =>
    ipcRenderer.invoke("save-csv-dialog", { csvContent, defaultFileName }),

  getKeys: () =>
    new Promise((resolve, reject) => {
      const fs = require("fs");
      const configPath = path.join(__dirname, "data", "config.json");
      fs.readFile(configPath, "utf8", (err, fileContents) => {
        if (!err) {
          try {
            const parsed = JSON.parse(fileContents);
            return resolve(parsed);
          } catch (parseErr) {
            console.warn(
              "Failed to parse data/config.json from app folder:",
              parseErr
            );
            // fall through to storage fallback
          }
        }
        // fallback to electron-json-storage
        storage.get("data/config.json", (error, data) => {
          if (error) return reject(error);
          resolve(data);
        });
      });
    }),

  saveConfig: (config) =>
    new Promise((resolve, reject) => {
      storage.set("data/config.json", config, (error) => {
        if (error) return reject(error);
        resolve();
      });
    }),

  checkConfig: () =>
    new Promise((resolve, reject) => {
      storage.get("data/config.json", (error, data) => {
        if (error) return reject(error);
        // Check if config has required keys
        const hasConfig = data && data.APOLLO_KEY && data.ZEROBOUNCE_KEY;
        resolve(hasConfig);
      });
    }),

  onUpdateStatus: (callback) =>
    ipcRenderer.on("update-status", (event, data) => callback(data)),
});
