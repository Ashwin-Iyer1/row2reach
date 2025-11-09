const path = require("node:path");
const { app, ipcMain, BrowserWindow } = require("electron");

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
    bccRecipients: (emailParams.bcc || []).map(email => ({
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
      bccRecipients: (emailParams.bcc || []).map(email => ({
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
