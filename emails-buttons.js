let variables = [];

function normalizeCsvRows(csv) {
  let rows;

  if (Array.isArray(csv)) {
    rows = csv.filter((row) => row.trim() !== "");
  } else {
    rows = csv.split(/\r?\n/).filter((row) => row.trim() !== "");
  }

  // 🛠 Fix for "bad" one-liner input
  if (rows.length === 1 && rows[0].includes("ContactOut Email,")) {
    const parts = rows[0].split(",");
    const header = parts.slice(0, 4).join(",");
    const data = parts.slice(4);

    const fixedRows = [header];
    for (let i = 0; i < data.length; i += 4) {
      const chunk = data.slice(i, i + 4);
      if (chunk.length) {
        fixedRows.push(chunk.join(","));
      }
    }
    rows = fixedRows;
  }

  return rows;
}

/**
 * Build a <table> element from CSV rows (first row is header).
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
 * Render a table into the container element.
 */
function renderTable(table) {
  const container = document.getElementById("table-container");
  container.innerHTML = ""; // Clear previous content
  container.appendChild(table);
}

/**
 * Dispatch a custom event that CSV rows have been updated.
 */
function dispatchCsvRowsUpdated(rows) {
  window.dispatchEvent(new CustomEvent("csv:rows-updated", { detail: rows }));
}

/**
 * Public function to display CSV as a table.
 * Accepts CSV string or array, normalizes, dispatches event, and renders table.
 */
function displayCsvAsTable(csv) {
  const rows = normalizeCsvRows(csv);
  if (rows.length === 0) return;

  dispatchCsvRowsUpdated(rows);
  const table = buildTableFromRows(rows);
  renderTable(table);
}

function getCSVHeaderNames(csv) {
  const rows = normalizeCsvRows(csv);
  if (rows.length === 0) return [];

  const headers = rows[0].split(",").map((h) => h.trim());
  return headers;
}

document
  .getElementById("back-arrow-button")
  .addEventListener("click", function () {
    window.electronAPI.navigateTo("index.html");
  });


document
  .getElementById("preview-button")
  .addEventListener("click", function () {
    const textInput = document.getElementById("body").value;
    const subjectInput = document.getElementById("subject").value;
    const preview_list = document.getElementById("preview-list");
    
    // Clear previous previews
    preview_list.innerHTML = "";
    
    // Get all data rows (skip header at index 0)
    if (enrichedCsvData && enrichedCsvData.length > 1) {
      const headers = enrichedCsvData[0].split(",").map(h => h.trim());
      
      // Process each data row
      for (let i = 1; i < enrichedCsvData.length; i++) {
        const dataRow = enrichedCsvData[i].split(",").map(d => d.trim());
        
        let formattedText = textInput;
        let formattedSubject = subjectInput;
        
        // Replace each variable with corresponding data for this row
        headers.forEach((header, index) => {
          const variable = `{${header}}`;
          const value = dataRow[index] || '';
          formattedText = formattedText.replace(new RegExp(escapeRegExp(variable), 'g'), value);
          formattedSubject = formattedSubject.replace(new RegExp(escapeRegExp(variable), 'g'), value);
        });
        
        // Add a label to identify which row this preview is for
        const label = document.createElement("div");
        label.style.fontWeight = "bold";
        label.style.marginBottom = "5px";
        label.textContent = `Preview for Row ${i}:`;
        
        // Create a p element for the subject preview
        const subjectPreview = document.createElement("p");
        subjectPreview.style.fontWeight = "bold";
        subjectPreview.style.marginBottom = "5px";
        subjectPreview.style.padding = "5px";
        subjectPreview.textContent = `${formattedSubject}`;
        
        // Create a textarea for this row's body preview
        const textarea = document.createElement("textarea");
        textarea.id = `preview-textarea`;
        textarea.value = formattedText;
        
        preview_list.appendChild(label);
        preview_list.appendChild(subjectPreview);
        preview_list.appendChild(textarea);
      }
    } else {
      // If no CSV data, show message
      const message = document.createElement("div");
      message.textContent = "No CSV data available for preview";
      preview_list.appendChild(message);
    }
  });// Helper function to escape special regex characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}// on page load, get emails from local storage and populate the textarea
window.addEventListener("DOMContentLoaded", () => {
  const emails = JSON.parse(localStorage.getItem("emails") || "[]");
  const emailsList = document.getElementById("emails-list");

  // Check if the element exists before trying to use it
  if (!emailsList) {
    console.error("Element with ID 'emails-list' not found");
    return;
  }
  const localData = localStorage.getItem("emailsAsCsv");
  enrichedCsvData = normalizeCsvRows(localData);
  displayCsvAsTable(enrichedCsvData);
  variables = getCSVHeaderNames(localData);
  const variables_list = document.getElementById("variables-list");
  for (const varName of variables) {
    if (!variables_list.innerText.includes(varName)) {
      const p = document.createElement("p");
      p.textContent = `{${varName}}`;
      variables_list.appendChild(p);
    }
  }

  // loop through emails and make a new <p> for each email in the emails-list div
  emails.forEach((email) => {
    const p = document.createElement("p");
    p.textContent = email;
    emailsList.appendChild(p);
  });
});
