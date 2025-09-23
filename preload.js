    // preload.js
    const { contextBridge, ipcRenderer } = require('electron');

    contextBridge.exposeInMainWorld('env', {
      electron_key: process.env.APOLLO_KEY,
      zerobounce_key: process.env.ZEROBOUNCE_KEY
    });