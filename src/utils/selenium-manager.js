const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const os = require("os");
const axios = require("axios");
const AdmZip = require("adm-zip");
const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const { app } = require("electron");

class SeleniumManager {
  constructor() {
    this.driversDir = path.join(app.getPath("userData"), "drivers");
    if (!fs.existsSync(this.driversDir)) {
      fs.mkdirSync(this.driversDir, { recursive: true });
    }
  }

  /**
   * Get the locally installed Chrome version on macOS
   */
  getChromeVersion() {
    try {
      // macOS default path
      const command =
        '"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --version';
      const output = execSync(command).toString().trim();
      // Output format: "Google Chrome 120.0.6099.109"
      const versionMatch = output.match(/Google Chrome (\d+\.\d+\.\d+\.\d+)/);
      if (versionMatch && versionMatch[1]) {
        return versionMatch[1];
      }
    } catch (error) {
      console.error("Error getting Chrome version:", error);
    }
    return null;
  }

  /**
   * Determine the correct ChromeDriver version and URL
   */
  async getDriverVersionInfo(chromeVersion) {
    const majorVersion = parseInt(chromeVersion.split(".")[0]);

    // Logic for Chrome >= 115 (Chrome for Testing)
    if (majorVersion >= 115) {
      try {
        // Determine platform string for CfT
        const platform = "mac-arm64"; // Assuming user is on Apple Silicon based on package.json "arch=arm64". If could be x64, need detection.
        // Let's detect arch roughly
        const isArm = process.arch === "arm64";
        const cftPlatform = isArm ? "mac-arm64" : "mac-x64";

        console.log(
          `Checking CfT endpoints for Chrome ${chromeVersion} on ${cftPlatform}...`
        );

        const url =
          "https://googlechromelabs.github.io/chrome-for-testing/latest-versions-per-milestone-with-downloads.json";
        const response = await axios.get(url);
        const data = response.data;

        const milestoneData = data.milestones[majorVersion.toString()];
        if (
          milestoneData &&
          milestoneData.downloads &&
          milestoneData.downloads.chromedriver
        ) {
          const driverInfo = milestoneData.downloads.chromedriver.find(
            (d) => d.platform === cftPlatform
          );
          if (driverInfo) {
            return {
              version: milestoneData.version,
              url: driverInfo.url,
              isCft: true, // Flag to know folder structure might differ
            };
          }
        }
      } catch (error) {
        console.error("Error fetching CfT versions:", error);
      }
    }

    // Fallback or Legacy (Chrome < 115)
    // Even for newer versions, sometime LATEST_RELEASE works if CfT fails, but strictly speaking specific logic applies.
    // For strictly < 115:
    console.log(
      `Checking legacy LATEST_RELEASE for major version ${majorVersion}...`
    );
    try {
      const latestReleaseUrl = `https://chromedriver.storage.googleapis.com/LATEST_RELEASE_${majorVersion}`;
      const response = await axios.get(latestReleaseUrl);
      const driverVersion = response.data.trim();

      // Construct download URL
      // macOS legacy zip name
      const isArm = process.arch === "arm64";
      // Note: Legacy chromedriver didn't always have m1 specific builds for older versions, usually just mac64.
      // But for recent pre-115, mac64_m1 existed. Simpler to try mac64 as general fallback?
      // Actually, Google provided chromedriver_mac64.zip for Intel and chromedriver_mac64_m1.zip for Apple Silicon.
      // Let's try to match exactly if possible, or fallback.

      let zipName = "chromedriver_mac64.zip";
      if (isArm) {
        // Check if we should try m1 specific.
        // Getting exact URL is tricky without checking 404.
        // We'll stick to mac64 for safety unless we code specific checks.
        // Actually, let's assume standard mac64 works via Rosetta if needed, or try to be smart.
        // For this implementation, let's stick to standard names.
        // However, for recent versions, it's safer.
      }

      return {
        version: driverVersion,
        url: `https://chromedriver.storage.googleapis.com/${driverVersion}/${zipName}`,
        isCft: false,
      };
    } catch (err) {
      console.error("Legacy version check failed:", err);
    }

    throw new Error(
      `Could not find compatible ChromeDriver for Chrome ${chromeVersion}`
    );
  }

  async downloadAndExtractDriver(url, version, isCft) {
    const destZip = path.join(this.driversDir, `chromedriver_${version}.zip`);
    const extractPath = path.join(this.driversDir, version); // Extract into a versioned folder

    if (fs.existsSync(extractPath)) {
      // Assume already exists and valid
      // Retrieve executable path
      const binaryPath = this.findDriverBinary(extractPath);
      if (binaryPath) {
        fs.chmodSync(binaryPath, "755");
        return binaryPath;
      }
    }

    console.log(`Downloading ChromeDriver ${version} from ${url}...`);

    // Download
    const writer = fs.createWriteStream(destZip);
    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
    });

    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    console.log("Download complete. Extracting...");

    // Unzip
    const zip = new AdmZip(destZip);
    zip.extractAllTo(extractPath, true);

    // Cleanup zip
    fs.unlinkSync(destZip);

    // Make executable (mac/linux)
    const binaryPath = this.findDriverBinary(extractPath);
    if (binaryPath) {
      fs.chmodSync(binaryPath, "755");
      return binaryPath;
    } else {
      throw new Error("Driver binary not found after extraction");
    }
  }

  findDriverBinary(dir) {
    // Recursive search for 'chromedriver' file
    const files = fs.readdirSync(dir, { recursive: true });
    for (const file of files) {
      // Strictly match the binary name to avoid matching LICENSE.chromedriver or THIRD_PARTY_NOTICES.chromedriver
      if (file === "chromedriver" || file === "chromedriver.exe") {
        return path.join(dir, file);
      }
    }
    // If recursive read isn't available in node version (added in v20, let's assume basic search or implement walk if needed)
    // Node 20 is not guaranteed. Let's do a simple manual walk or assume known structure.
    // CfT: chromedriver-mac-arm64/chromedriver
    // Legacy: chromedriver

    try {
      // Simple checks
      if (fs.existsSync(path.join(dir, "chromedriver")))
        return path.join(dir, "chromedriver");

      // Check subfolders
      const subitems = fs.readdirSync(dir);
      for (const item of subitems) {
        const subPath = path.join(dir, item);
        if (fs.statSync(subPath).isDirectory()) {
          const binary = path.join(subPath, "chromedriver");
          if (fs.existsSync(binary)) return binary;
        }
      }
    } catch (e) {
      console.error("Error finding binary:", e);
    }
    return null;
  }

  async launch() {
    console.log("Launching Selenium...");
    const chromeVersion = this.getChromeVersion();
    if (!chromeVersion) {
      throw new Error("Chrome is not installed or could not be detected.");
    }

    console.log(`Detected Chrome version: ${chromeVersion}`);

    const driverInfo = await this.getDriverVersionInfo(chromeVersion);
    console.log(`Target Driver Version: ${driverInfo.version}`);

    const driverPath = await this.downloadAndExtractDriver(
      driverInfo.url,
      driverInfo.version,
      driverInfo.isCft
    );
    console.log(`Driver Path: ${driverPath}`);

    const service = new chrome.ServiceBuilder(driverPath);

    // Configure Chrome Options
    const options = new chrome.Options();

    // Disable popup blocking and automation flags
    options.addArguments("--disable-popup-blocking");
    options.excludeSwitches("enable-automation");

    // Persist session with user profile
    const profilePath = path.join(app.getPath("userData"), "selenium_profile");
    if (!fs.existsSync(profilePath)) {
      fs.mkdirSync(profilePath, { recursive: true });
    }
    options.addArguments(`user-data-dir=${profilePath}`);

    // Launch Browser
    const driver = await new Builder()
      .forBrowser("chrome")
      .setChromeService(service)
      .setChromeOptions(options)
      .build();

    await driver.get("https://outlook.office.com/mail/");

    console.log("Waiting for user to log in and element to appear...");

    await driver.wait(
      until.elementLocated(By.css(".row.title.ext-title")),
      300000
    );

    console.log("Sign in found");

    await driver.wait(
      until.elementLocated(By.css('[data-testid="banner"]')),
      300000
    );

    console.log("Banner found");

    return driver;
  }
}

module.exports = new SeleniumManager();
