const { contextBridge, ipcRenderer, app, webUtils } = require("electron");
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
  onSeleniumSendComplete: (callback) => ipcRenderer.on("selenium-send-complete", (event, data) => callback(data)),
  onSeleniumDraftComplete: (callback) => ipcRenderer.on("selenium-draft-complete", (event, data) => callback(data)),

  saveCsvFile: (csvContent, defaultFileName) =>
    ipcRenderer.invoke("save-csv-dialog", { csvContent, defaultFileName }),

  getKeys: () =>
    new Promise((resolve, reject) => {
      // First try to get from user storage (where we save it)
      storage.get("data/config.json", (error, data) => {
        if (!error && data && Object.keys(data).length > 0) {
          return resolve(data);
        }

        // Fallback: Try to read from app folder (dev mode or pre-bundled)
        const fs = require("fs");
        const configPath = path.join(__dirname, "data", "config.json");

        fs.readFile(configPath, "utf8", (err, fileContents) => {
          if (err) {
            // If both fail, resolve with empty object or reject
            console.warn("Config not found in storage or app folder");
            return resolve({});
          }

          try {
            const parsed = JSON.parse(fileContents);
            resolve(parsed);
          } catch (parseErr) {
            console.warn("Failed to parse app config:", parseErr);
            resolve({});
          }
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

  getPathForFile: (file) => webUtils.getPathForFile(file),
});
