const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const os = require("os");
const axios = require("axios");
const AdmZip = require("adm-zip");
const { Builder, By, until, Key } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const { app, clipboard } = require("electron");

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
    if (process.platform === "darwin") {
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
        console.error("Error getting Chrome version on macOS:", error);
      }
    } else if (process.platform === "win32") {
      try {
        // Windows: Try registry or default paths
        // Ideally use reg query, but simple path check is often enough for standard installs
        // Method 1: Reg query
        try {
          const command =
            'reg query "HKEY_CURRENT_USER\\Software\\Google\\Chrome\\BLBeacon" /v version';
          const output = execSync(command).toString();
          const match = output.match(/version\s+REG_SZ\s+([\d.]+)/);
          if (match && match[1]) return match[1];
        } catch (e) {
          // ignore
        }

        // Method 2: Check standard paths with WMIC or similar, or just try to run it?
        // Let's try to run wmic to get version from executable
        const possiblePaths = [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
          path.join(
            os.homedir(),
            "AppData\\Local\\Google\\Chrome\\Application\\chrome.exe"
          ),
        ];

        for (const exePath of possiblePaths) {
          if (fs.existsSync(exePath)) {
            // Use wmic to get version
            const cmd = `wmic datafile where name="${exePath.replace(
              /\\/g,
              "\\\\"
            )}" get Version /value`;
            const output = execSync(cmd).toString();
            // Output: Version=120.0.6099.109
            const match = output.match(/Version=([\d.]+)/);
            if (match && match[1]) return match[1];
          }
        }
      } catch (error) {
        console.error("Error getting Chrome version on Windows:", error);
      }
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
        // Detect OS and Arch
        let cftPlatform = "";
        if (process.platform === "darwin") {
          const isArm = process.arch === "arm64";
          cftPlatform = isArm ? "mac-arm64" : "mac-x64";
        } else if (process.platform === "win32") {
          // Chrome for Testing generally has win32 and win64
          // If we are on x64 node, likely valid to use win64, but typically win32 binary works on both?
          // Actually win64 is preferred if available.
          cftPlatform = process.arch === "x64" ? "win64" : "win32";
        } else {
          // Fallback or linux
          cftPlatform = "linux64"; // Naive fallback
        }

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
      let zipName = "";
      if (process.platform === "darwin") {
        zipName =
          process.arch === "arm64"
            ? "chromedriver_mac64_m1.zip"
            : "chromedriver_mac64.zip";
        // Fallback logic for older versions if m1 specific doesn't exist?
        // For simplicity, let's keep it somewhat dynamic or default to mac64 if simple
        // But the user's code had "chromedriver_mac64.zip" hardcoded before with a TODO.
        // Let's rely on standard mac64 which works via Rosetta usually, or improved logic.
        // Actually, let's stick to the previous hardcoded 'chromedriver_mac64.zip' if we want to be safe for legacy,
        // but strictly speaking 'chromedriver_mac64_m1.zip' is better for M1.
        // If the user's previous code worked, it was using 'chromedriver_mac64.zip' implicitly in the fallback block?
        // Wait, line 104 was `let zipName = "chromedriver_mac64.zip";`
        zipName = "chromedriver_mac64.zip";
      } else if (process.platform === "win32") {
        zipName = "chromedriver_win32.zip"; // Legacy usually only had win32
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
      // Strictly match the binary name
      if (
        file === "chromedriver" ||
        file === "chromedriver.exe" ||
        file.endsWith(path.sep + "chromedriver") ||
        file.endsWith(path.sep + "chromedriver.exe")
      ) {
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
    service.enableVerboseLogging();
    service.setStdio("inherit");

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

    try {
      // Check for username field
      const usernameBox = await driver
        .wait(
          until.elementLocated(By.css(".input.text-box")),
          5000 // Short timeout: if we are already logged in, this will timeout quickly and we'll proceed
        )
        .catch(() => null);

      if (usernameBox) {
        console.log("Found login page, attempting auto-login...");

        await driver
          .wait(until.elementLocated(By.css(".input.text-box")), 30000)
          .catch(() => null);

        // look for any text on the screen says Enter password or Enter your password
        // dont look for inputs

        console.log("user has entered email");

        // Wait for password screen by checking for the heading text "Enter password" or "Enter your password"
        // Matching both div with role=heading and h1 tags
        await driver.wait(
          until.elementLocated(
            By.xpath(
              "//*[(@role='heading' or local-name()='h1') and (contains(text(), 'Enter password') or contains(text(), 'Enter your password'))]"
            )
          ),
          30000
        );

        console.log("Password screen detected");
      } else {
        console.log("Already logged in or login page skipped.");
      }
    } catch (e) {
      console.log("Auto-login skipped or failed:", e.message);
    }

    // Wait for 'New mail' button to ensure we are logged in
    try {
      await driver.wait(
        until.elementLocated(By.css('button[aria-label="New mail"]')),
        60000
      );
      console.log("Login successful: 'New mail' button found.");
    } catch (e) {
      console.log(
        "Timed out waiting for 'New mail' button. User might need to login manually."
      );
    }

    return driver;
  }

  async createEmail(driver, recipient, bcc, subject, body, sendNow = false) {
    const newMailButton = await driver.wait(
      until.elementLocated(By.css('button[aria-label="New mail"]')),
      60000
    );
    console.log("Login successful: 'New mail' button found.");

    await newMailButton.click();
    console.log("New mail button clicked");

    // Wait for the compose form to animate in
    await driver.sleep(1000);

    // 1. Handle Recipient (To)
    try {
      // Outlook uses a contenteditable div for the "To" field, not a simple input.
      // Selector based on user snippet: div[contenteditable="true"][aria-label="To"]
      const toInput = await driver.wait(
        until.elementLocated(
          By.css('div[contenteditable="true"][aria-label="To"]')
        ),
        10000
      );

      await driver.wait(until.elementIsVisible(toInput), 5000);

      await driver
        .actions()
        .click(toInput)
        .pause(500)
        .sendKeys(recipient)
        .pause(500)
        .sendKeys(Key.RETURN)
        .perform();

      console.log(`Recipient '${recipient}' added`);
    } catch (e) {
      console.error("Error setting recipient:", e);
    }

    // 2. Handle BCC
    if (bcc && bcc.length > 0) {
      try {
        // Click Bcc button to reveal field
        const bccButton = await driver.findElement(
          By.xpath("//button[text()='Bcc']")
        );
        await bccButton.click();
        console.log("Clicked Bcc button");

        // Wait for Bcc input to appear
        // Selector based on user snippet: div[contenteditable="true"][aria-label="Bcc"]
        const bccInput = await driver.wait(
          until.elementLocated(
            By.css('div[contenteditable="true"][aria-label="Bcc"]')
          ),
          5000
        );

        await driver.wait(until.elementIsVisible(bccInput), 5000);

        // Handle BCC as array or string
        const bccList = Array.isArray(bcc) ? bcc : [bcc];
        for (const bccEmail of bccList) {
          await driver
            .actions()
            .click(bccInput)
            .pause(300)
            .sendKeys(bccEmail)
            .pause(300)
            .sendKeys(Key.RETURN)
            .perform();
          console.log(`BCC '${bccEmail}' added`);
        }
      } catch (e) {
        console.error("Error setting BCC:", e);
      }
    }

    // 3. Handle Subject
    try {
      const subjectInput = await driver.findElement(
        By.css('input[aria-label="Subject"]')
      );
      await subjectInput.sendKeys(subject);
      console.log("Subject set");
    } catch (e) {
      console.error("Error setting subject:", e);
    }

    // 4. Handle Body
    try {
      let bodyTarget;
      try {
        // Try to find the "Type /" placeholder as requested by user
        // This element usually overlays the empty editor
        bodyTarget = await driver.findElement(
          By.xpath("//span[contains(text(), 'Type / to insert files')]")
        );
        console.log("Found 'Type /' placeholder");
      } catch (err) {
        // Fallback to the main contenteditable div if placeholder is missing (e.g. signature present)
        console.log(
          "'Type /' placeholder not found, using generic body selector"
        );
        bodyTarget = await driver.findElement(
          By.css('div[aria-label="Message body"]')
        );
      }

      // Write rich text to clipboard
      const plainText = body.replace(/<[^>]*>?/gm, "");
      clipboard.write({
        text: plainText,
        html: body,
      });

      const modifierKey =
        process.platform === "darwin" ? Key.COMMAND : Key.CONTROL;

      await driver
        .actions()
        .click(bodyTarget)
        .pause(500)
        // Move to top of body
        .keyDown(modifierKey)
        .sendKeys(Key.UP)
        .keyUp(modifierKey)
        .pause(100)
        // Paste from clipboard
        .keyDown(modifierKey)
        .sendKeys("v")
        .keyUp(modifierKey)
        .pause(500)
        .perform();

      console.log("Body set (pasted)");
    } catch (e) {
      console.error("Error setting body:", e);
    }

    // 5. Send or Save Draft
    try {
      if (sendNow) {
        // Find and click the Send button
        const sendButton = await driver.findElement(
          By.css('button[aria-label="Send"]')
        );
        await sendButton.click();
        console.log("Email sent");
        await driver.sleep(2000); // Wait for send to complete
      } else {
        // Close the compose window to save as draft
        const closeButton = await driver.findElement(
          By.css('button[aria-label="Close"]')
        );
        await closeButton.click();
        console.log("Draft saved");
        await driver.sleep(1000);
      }
    } catch (e) {
      console.error("Error sending/saving email:", e);
    }
  }

  async sendMultipleEmails(driver, emailList, sendNow = false) {
    console.log(`Processing ${emailList.length} emails...`);

    for (let i = 0; i < emailList.length; i++) {
      const { recipient, bcc, subject, body } = emailList[i];
      console.log(
        `Processing email ${i + 1}/${emailList.length} to ${recipient}`
      );

      try {
        await this.createEmail(driver, recipient, bcc, subject, body, sendNow);
        console.log(
          `Email ${i + 1} ${sendNow ? "sent" : "drafted"} successfully`
        );
      } catch (error) {
        console.error(`Error processing email ${i + 1}:`, error);
      }

      // Small delay between emails to avoid rate limiting
      if (i < emailList.length - 1) {
        await driver.sleep(1000);
      }
    }

    console.log(`Completed processing ${emailList.length} emails`);
  }
}

module.exports = new SeleniumManager();
