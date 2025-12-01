const path = require("node:path");
const {
  app,
  ipcMain,
  BrowserWindow,
  dialog,
  Menu,
  autoUpdater,
} = require("electron");
const fs = require("fs");

// Initialize auto-updates
const { updateElectronApp } = require("update-electron-app");
updateElectronApp();

const AuthProvider = require("./App/AuthProvider");
const { IPC_MESSAGES } = require("./App/constants");
const { protectedResources, msalConfig } = require("./App/authConfig.js");

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: false,
    },
  });
  authProvider = new AuthProvider(msalConfig);
  win.loadFile("index.html");

  // Create custom menu
  const template = [
    {
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        {
          label: "Check for Updates...",
          click: () => {
            autoUpdater.checkForUpdates();
          },
        },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "pasteAndMatchStyle" },
        { role: "delete" },
        { role: "selectAll" },
        { type: "separator" },
        {
          label: "Speech",
          submenu: [{ role: "startSpeaking" }, { role: "stopSpeaking" }],
        },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        { type: "separator" },
        { role: "front" },
        { type: "separator" },
        { role: "window" },
      ],
    },
    {
      role: "help",
      submenu: [
        {
          label: "Learn More",
          click: async () => {
            const { shell } = require("electron");
            await shell.openExternal("https://electronjs.org");
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
ipcMain.on("navigate-to", (event, page) => {
  if (win) {
    win.loadFile(page);
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.on(IPC_MESSAGES.LOGIN, async () => {
  const response = await authProvider.login();
  if (response) {
    if (response.name.length > 0) {
      win.webContents.send("hide-button-message", "hide");
    }
  }
  console.log(response);
});

ipcMain.on(IPC_MESSAGES.SENDEMAIL, async (event, emailParams) => {
  const tokenRequest = {
    scopes: protectedResources.graphMe.scopes,
  };
  const tokenResponse = await authProvider.getToken(tokenRequest);

  const url = "https://graph.microsoft.com/v1.0/me/messages";
  const headers = {
    Authorization: `Bearer ${tokenResponse.accessToken}`,
    "Content-Type": "application/json",
  };

  // Draft format: just the message object
  const draftMessage = {
    subject: emailParams.subject,
    importance: emailParams.importance || "Normal",
    body: {
      contentType: "HTML",
      content: emailParams.body,
    },
    toRecipients: [
      {
        emailAddress: {
          address: emailParams.recipient,
        },
      },
    ],
    bccRecipients: (emailParams.bcc || []).map((email) => ({
      emailAddress: {
        address: email,
      },
    })),
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(draftMessage),
  });

  const data = await response.json().catch(() => ({}));
  console.log("📄 Draft created:", data);
});

ipcMain.on(IPC_MESSAGES.SENDMAILNOW, async (event, emailParams) => {
  const tokenRequest = {
    scopes: protectedResources.graphMe.scopes,
  };
  const tokenResponse = await authProvider.getToken(tokenRequest);

  const url = "https://graph.microsoft.com/v1.0/me/sendMail";
  const headers = {
    Authorization: `Bearer ${tokenResponse.accessToken}`,
    "Content-Type": "application/json",
  };

  // Send mail format: wrap the message in a "message" property
  const emailMessage = {
    message: {
      subject: emailParams.subject,
      importance: emailParams.importance || "Normal",
      body: {
        contentType: "HTML",
        content: emailParams.body,
      },
      toRecipients: [
        {
          emailAddress: {
            address: emailParams.recipient,
          },
        },
      ],
      bccRecipients: (emailParams.bcc || []).map((email) => ({
        emailAddress: {
          address: email,
        },
      })),
    },
    saveToSentItems: true,
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(emailMessage),
  });

  if (response.ok) {
    console.log("✅ Email sent successfully to:", emailParams.recipient);
  } else {
    const errorData = await response.json().catch(() => ({}));
    console.error("❌ Failed to send email:", errorData);
  }
});

// Handle save file dialog
ipcMain.handle(
  "save-csv-dialog",
  async (event, { csvContent, defaultFileName }) => {
    const { filePath, canceled } = await dialog.showSaveDialog(win, {
      title: "Save CSV File",
      defaultPath: defaultFileName || "enriched_emails.csv",
      filters: [
        { name: "CSV Files", extensions: ["csv"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });

    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }

    try {
      fs.writeFileSync(filePath, csvContent, "utf8");
      return { success: true, filePath };
    } catch (error) {
      console.error("Error saving CSV file:", error);
      return { success: false, error: error.message };
    }
  }
);
