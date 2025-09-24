require('dotenv').config();
const { app, BrowserWindow, Menu } = require('electron/main')
const path = require('node:path')


const temaplate = [
  {
    label: 'File',
    submenu: [
      { label: 'quit',
        click() {
          app.quit()
        }
       }
    ]
  },
  {label: "Developer",
  submenu: [
    { label: 'toggledevtools',
      click() {
        console.log("Toggle dev tools")
        BrowserWindow.getFocusedWindow().toggleDevTools()
      }
     },
  ]}
  
]

function createWindow () {
    const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js') // If using a preload script
    }
  })

  const menu = Menu.buildFromTemplate(temaplate)
  Menu.setApplicationMenu(menu)


  win.loadFile('index.html')
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})