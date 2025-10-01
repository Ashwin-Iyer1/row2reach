const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");

let win;

function createWindow () {
  win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: false
    }
  });
  win.loadFile('index.html');
}
ipcMain.on("navigate-to", (event, page) => {
  if (win) {
    win.loadFile(page);
  }
});




app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
