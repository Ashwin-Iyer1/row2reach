// ------------------------------
// CSV Table Rendering Utilities
// ------------------------------

/**
 * Split a CSV string into rows and remove empty lines.
 */
function parseCsvStringToRows(csv) {
  return csv.split(/\r?\n/).filter((row) => row.trim() !== "");
}

/**
 * Build an HTML table from rows (first row is header).
 */
function buildTableFromRows(rows) {
  const table = document.createElement("table");
  table.border = "1"; // Basic styling

  // Header
  const headers = rows[0].split(",");
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headers.forEach((headerText) => {
    const th = document.createElement("th");
    th.textContent = headerText.trim();
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement("tbody");
  for (let i = 1; i < rows.length; i++) {
    const rowData = rows[i].split(",");
    const tr = document.createElement("tr");
    rowData.forEach((cellData) => {
      const td = document.createElement("td");
      td.textContent = cellData.trim();
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  return table;
}

/**
 * Render a table into the page container.
 */
function renderTable(table) {
  const container = document.getElementById("table-container");
  container.innerHTML = ""; // Clear previous content
  container.appendChild(table);
  const download_csv_button = document.getElementById("download-csv-button");
  download_csv_button.style.display = "inline-block"; // Show download button
}

/**
 * Public function: display CSV as a table (string input only in this file).
 * Also dispatches "csv:rows-updated" with parsed rows.
 */
function displayCsvAsTable(csv) {
  const rows = parseCsvStringToRows(csv);
  if (rows.length === 0) return;

  window.dispatchEvent(new CustomEvent("csv:rows-updated", { detail: rows }));

  const table = buildTableFromRows(rows);
  renderTable(table);
}

// ------------------------------
// File Input Handler
// ------------------------------

document.getElementById("csv-input").addEventListener("change", function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const csvContent = e.target.result;
    displayCsvAsTable(csvContent);
  };
  reader.readAsText(file);
});