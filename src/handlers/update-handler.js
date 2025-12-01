/**
 * Handles auto-update UI events
 */

export function initializeUpdateHandlers() {
  const modal = document.getElementById("update-modal");
  const title = document.getElementById("update-title");
  const message = document.getElementById("update-message");
  const progressBar = document.getElementById("update-progress");
  const closeButton = document.getElementById("close-update-modal");

  if (!modal || !window.electronAPI) return;

  // Close button handler
  closeButton.addEventListener("click", () => {
    modal.style.display = "none";
  });

  // Listen for update status
  window.electronAPI.onUpdateStatus((data) => {
    modal.style.display = "flex";
    progressBar.style.display = "none";

    switch (data.status) {
      case "checking":
        title.textContent = "Checking for Updates";
        message.textContent = "Checking for new versions...";
        break;

      case "available":
        title.textContent = "Update Available";
        message.textContent = "Downloading new version...";
        progressBar.style.display = "block";
        break;

      case "not-available":
        title.textContent = "No Updates";
        message.textContent = "You are on the latest version.";
        // Auto-close after 2 seconds for "no update"
        setTimeout(() => {
          modal.style.display = "none";
        }, 2000);
        break;

      case "downloaded":
        title.textContent = "Update Ready";
        message.textContent =
          "Update downloaded. It will be installed on restart.";
        progressBar.style.display = "none";
        break;

      case "error":
        title.textContent = "Update Error";
        message.textContent =
          data.error || "An error occurred while checking for updates.";
        break;
    }
  });
}
