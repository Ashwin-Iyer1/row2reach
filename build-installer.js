const electronInstaller = require("electron-winstaller");

// Configuration for the Windows installer
const resultPromise = electronInstaller.createWindowsInstaller({
  appDirectory: "./release-builds/Row_2_Reach-win32-x64",
  outputDirectory: "./release-builds/installers",
  authors: "Ashwin Iyer",
  exe: "Row 2 Reach.exe",
  setupExe: "Row2ReachSetup.exe",
  noMsi: true,
  setupIcon: "./assets/icon.ico",
});

resultPromise.then(
  () => {
    console.log("✅ Windows installer created successfully!");
    console.log("📦 Installer location: ./release-builds/installers");
  },
  (e) => {
    console.error(`❌ No dice: ${e.message}`);
  }
);
