// Configuration page logic
const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const configForm = document.getElementById("config-form");
const apolloKeyInput = document.getElementById("apollo-key");
const zeroBounceKeyInput = document.getElementById("zerobounce-key");
const configStatus = document.getElementById("config-status");
const closeButton = document.getElementById("close-config");

// Close button handler
closeButton.addEventListener("click", () => {
  window.electronAPI.navigateTo("index.html");
});

// Drag and drop handlers
dropZone.addEventListener("click", () => {
  fileInput.click();
});

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("drag-over");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
});

fileInput.addEventListener("change", (e) => {
  if (e.target.files.length > 0) {
    handleFile(e.target.files[0]);
  }
});

// Handle JSON file
function handleFile(file) {
  if (!file.name.endsWith(".json")) {
    showStatus("Please upload a JSON file", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const config = JSON.parse(e.target.result);

      // Validate config structure
      if (!config.APOLLO_KEY || !config.ZEROBOUNCE_KEY) {
        showStatus(
          "Invalid config file. Must contain APOLLO_KEY and ZEROBOUNCE_KEY",
          "error"
        );
        return;
      }

      // Populate form fields
      apolloKeyInput.value = config.APOLLO_KEY;
      zeroBounceKeyInput.value = config.ZEROBOUNCE_KEY;

      showStatus(
        'Config file loaded successfully! Click "Save Configuration" to continue.',
        "success"
      );
    } catch (error) {
      showStatus("Error parsing JSON file: " + error.message, "error");
    }
  };

  reader.readAsText(file);
}

// Handle form submission
configForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const apolloKey = apolloKeyInput.value.trim();
  const zeroBounceKey = zeroBounceKeyInput.value.trim();

  if (!apolloKey || !zeroBounceKey) {
    showStatus("Please fill in all fields", "error");
    return;
  }

  const config = {
    APOLLO_KEY: apolloKey,
    ZEROBOUNCE_KEY: zeroBounceKey,
  };

  try {
    showStatus("Saving configuration...", "info");
    await window.electronAPI.saveConfig(config);
    showStatus("Configuration saved successfully! Redirecting...", "success");

    // Navigate to main page after short delay
    setTimeout(() => {
      window.electronAPI.navigateTo("index.html");
    }, 1000);
  } catch (error) {
    showStatus("Error saving configuration: " + error.message, "error");
  }
});

// Show status message
function showStatus(message, type) {
  configStatus.textContent = message;
  configStatus.className = `config-status ${type}`;
  configStatus.style.display = "block";
}
