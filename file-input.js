// ------------------------------
// File Input Handler
// ------------------------------

const csvInput = document.getElementById("csv-input");

if (csvInput) {
  csvInput.addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      const csvContent = e.target.result;
      if (typeof window.displayCsvAsTable === "function") {
        window.displayCsvAsTable(csvContent);
      } else {
        console.error("displayCsvAsTable not found on window object.");
        alert("Application not fully loaded. Please wait or reload.");
      }
    };
    reader.readAsText(file);
  });
}

