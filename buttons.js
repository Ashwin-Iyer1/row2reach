
// ------------------------------
// CSV Table Rendering Utilities
// ------------------------------
/**
 * Normalize CSV input to an array of non-empty row strings.
 * Accepts either a CSV string or an array of rows and filters out empty lines.
 */
function normalizeCsvRows(csv) {
  if (Array.isArray(csv)) {
    return csv.filter((row) => row.trim() !== "");
  }
  return csv.split(/\r?\n/).filter((row) => row.trim() !== "");
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
  const download_csv_button = document.getElementById("download-csv-button");
  const email_users_button = document.getElementById("email-users-button");
  email_users_button.style.display = "inline-block"; // Show email users button
  download_csv_button.style.display = "inline-block"; // Show download button
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

// ------------------------------
// State
// ------------------------------
let csvRows = [];
let enrichedCsvData = []; // Store the enriched data

// Keep this event as-is to initialize/track CSV rows in memory
window.addEventListener("csv:rows-updated", (e) => {
  csvRows = e.detail;
  enrichedCsvData = [...csvRows]; // Initialize with original CSV data
  console.log("CSV rows updated:", csvRows);
});

// ------------------------------
// Small DOM Utilities
// ------------------------------

/**
 * Replace inner text of a DOM element by id.
 */
const replaceText = (selector, text) => {
  const element = document.getElementById(selector);
  if (element) element.innerText = text;
};

// ------------------------------
// Apollo Helpers
// ------------------------------

/**
 * Convert CSV rows (excluding header) to Apollo "details" objects.
 */
function getApolloDetailsFromCsvRows(rows) {
  if (rows.length < 2) return []; // Need at least header + 1 data row
  
  const headers = rows[0].split(",").map(h => h.trim().toLowerCase());
  
  // Find column indices by looking for keywords
  const nameIndex = headers.findIndex(h => h.includes("name"));
  const organizationIndex = headers.findIndex(h => h.includes("organization"));
  const linkedinIndex = headers.findIndex(h => h.includes("linkedin"));
  
  return rows.slice(1).map((line) => {
    const columns = line.split(",").map(col => col.trim());
    
    return {
      name: nameIndex >= 0 ? columns[nameIndex] : undefined,
      organization_name: organizationIndex >= 0 ? columns[organizationIndex] : undefined,
      linkedin_url: linkedinIndex >= 0 ? columns[linkedinIndex] : undefined,
    };
  });
}

/**
 * Build Apollo API request pieces (url, headers, body) using details.
 */
async function buildApolloRequest(details) {
  const url =
    "https://api.apollo.io/api/v1/people/bulk_match?reveal_personal_emails=false&reveal_phone_number=false";
  const object = await window.electronAPI.getKeys();
  console.log("Using Apollo key:", object.APOLLO_KEY);
    const headers = {
      accept: "application/json",
      "Cache-Control": "no-cache",
      "Content-Type": "application/json",
      "x-api-key": object.APOLLO_KEY, // use stored key
    };
    const body = JSON.stringify({ details });
    return { url, headers, body };
}

/**
 * Ensure the first row has a given header (append if missing).
 */
function ensureHeader(enrichedRows, headerName) {
  if (!enrichedRows.length) return enrichedRows;
  const headerRow = enrichedRows[0].split(",");
  if (!headerRow.includes(headerName)) {
    enrichedRows[0] = enrichedRows[0] + `,${headerName}`;
  }
  return enrichedRows;
}

/**
 * Apply Apollo matches list to the CSV rows, adding/setting "Apollo Email".
 * Logic preserved exactly (uses column index 4 if present, else appends).
 */
function applyApolloMatchesToCsv(originalRows, matchesList) {
  let rows = [...originalRows];

  // Ensure "Apollo Email" column header exists
  rows = ensureHeader(rows, "Apollo Email");

  // Populate each data row with corresponding email or empty field
  matchesList.forEach((match, index) => {
    const dataRowIndex = index + 1; // Skip header row
    if (dataRowIndex < rows.length) {
      const currentRow = rows[dataRowIndex].split(",");

      if (match && match.email) {
        // If row doesn't yet have the email column position, append
        if (currentRow.length < 5) {
          rows[dataRowIndex] = rows[dataRowIndex] + "," + match.email;
        } else {
          // Otherwise, replace value at index 4 (5th column)
          currentRow[4] = match.email;
          rows[dataRowIndex] = currentRow.join(",");
        }
      } else {
        // No email: append empty column if missing (keep same logic)
        if (currentRow.length < 5) {
          rows[dataRowIndex] = rows[dataRowIndex] + ",";
        }
      }
    }
  });

  return rows;
}

/**
 * Extract a simple list of emails from Apollo matches for UI display.
 */
function extractEmailsFromMatches(matchesList) {
  return matchesList.filter((m) => m && m.email).map((m) => m.email);
}


/**
 * Convert array of CSV rows back into a CSV string.
 */
function rowsToCsvString(rows) {
  return rows.join("\n");
}
// ------------------------------
// ContactOut Helpers
// ------------------------------

/**
 * Extract LinkedIn profile URLs from CSV rows (skipping header).
 */
function extractLinkedinProfiles(rows) {
 if (rows.length < 2) return []; // Need at least header + 1 data row
  
const headers = rows[0].split(",").map(h => h.trim().toLowerCase());

const linkedinIndex = headers.findIndex(h => h.includes("linkedin"));

return rows
  .slice(1)
  .map((line) => {
    const columns = line.split(",").map(col => col.trim());
    return linkedinIndex >= 0 ? columns[linkedinIndex] : undefined;
  })
  .filter((profile) => profile);}

/**
 * Build ContactOut API request pieces (url, headers, body).
 */

async function buildContactOutRequest(profiles) {
  const url = "https://api.contactout.com/v1/people/linkedin/batch";

  // 🔑 get stored keys from preload
  const object = await window.electronAPI.getKeys();
  console.log("Using ContactOut key:", object.CONTACTOUT_KEY);

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    token: object.CONTACTOUT_KEY,
  };
  const body = JSON.stringify({ profiles });
  return { url, headers, body };
}

/**
 * Apply ContactOut result emails to CSV rows, maintaining the "ContactOut Email" column.
 * Uses header lookup to find or append the column.
 */
function applyContactOutResultsToCsv(originalRows, data) {
  let rows = [...originalRows];

  // Ensure "ContactOut Email" column exists
  rows = ensureHeader(rows, "ContactOut Email");

  if (data.profiles && typeof data.profiles === 'object') {
    const headerCols = rows[0].split(",");
    const emailColumnIndex = headerCols.indexOf("ContactOut Email");
    const linkedinColumnIndex = headerCols.findIndex(header => 
      header.toLowerCase().includes("linkedin")
    );

    // Process each data row (skip header)
    for (let i = 1; i < rows.length; i++) {
      const currentRow = rows[i].split(",");
      
      if (linkedinColumnIndex !== -1 && linkedinColumnIndex < currentRow.length) {
        const linkedinUrl = currentRow[linkedinColumnIndex].trim();
        
        // Find matching profile in ContactOut response
        const emails = data.profiles[linkedinUrl] || [];
        const email = emails.length > 0 ? emails[0] : ""; // Use first email if multiple
        
        if (emailColumnIndex !== -1) {
          // Update existing "ContactOut Email" column
          currentRow[emailColumnIndex] = email;
          rows[i] = currentRow.join(",");
        } else {
          // Fallback: add new column at end (shouldn't happen due to ensureHeader above)
          rows[i] = rows[i] + "," + email;
        }
      }
    }
  }

  return rows;
}

// ------------------------------
// Apollo Button Handler
// ------------------------------

async function fetchApollo() {
  document.getElementById("apollo-data").innerText = "Loading...";
  const details = getApolloDetailsFromCsvRows(csvRows);
  console.log("Apollo clicked with details:", details);

  // ✅ await async buildApolloRequest
  const { url, headers, body } = await buildApolloRequest(details);

  fetch(url, { method: "POST", headers, body })
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        replaceText("apollo-data", data.error);
        return;
      }

      console.log("Success:", data);

      const matchesList = Array.isArray(data) ? data : data.matches || [];
      enrichedCsvData = applyApolloMatchesToCsv(csvRows, matchesList);

      displayCsvAsTable(enrichedCsvData);

      const emails = extractEmailsFromMatches(matchesList);
      const emailText =
        emails.length > 0 ? emails.join(", ") : "No emails found";
      console.log(emailText);
      replaceText("apollo-data", emailText);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}


document.getElementById("apollo-button").addEventListener("click", function () {
  if (!csvRows.length) {
    alert("Load a CSV first");
    return;
  }

  fetchApollo();
});

// ------------------------------
// ContactOut Button Handler
// ------------------------------

async function fetchContactOut() {
  const profiles = extractLinkedinProfiles(csvRows);
  document.getElementById("contact-out-data").innerText = "Loading...";  

  // ✅ await async request builder
  const { url, headers, body } = await buildContactOutRequest(profiles);

  fetch(url, {
    method: "POST",
    headers,
    body,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log("ContactOut Success:", data);

      if (!enrichedCsvData.length) {
        enrichedCsvData = [...csvRows];
      }

      enrichedCsvData = applyContactOutResultsToCsv(enrichedCsvData, data);

      displayCsvAsTable(enrichedCsvData);

      document.getElementById("contact-out-data").innerText =
        data.message || "ContactOut request completed";
    })
    .catch((error) => {
      console.error("ContactOut Error:", error);
      document.getElementById(
        "contact-out-data"
      ).innerText = `Error: ${error.message}`;
    });
}


document
  .getElementById("contact-out-button")
  .addEventListener("click", function () {
    if (!csvRows.length) {
      alert("Load a CSV first");
      return;
    }
    fetchContactOut();
  });

document
  .getElementById("fetch-all-button")
  .addEventListener("click", function () {
    if (!csvRows.length) {
      alert("Load a CSV first");
      return;
    }
    fetchApollo();
    fetchContactOut();
  });


document
  .getElementById("download-csv-button")
  .addEventListener("click", function () {
    var csvString;
    if (!enrichedCsvData.length) {
      csvString = rowsToCsvString(csvRows);
    }

    csvString = rowsToCsvString(enrichedCsvData);
    const blob = new Blob([csvString], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = "enriched_data.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });



document
  .getElementById("email-users-button")
  .addEventListener("click", function () {
    if (!enrichedCsvData.length) {
      alert("No enriched data to email.");
      return;
    }
    
    // Extract emails from the enriched CSV data
    const rows = normalizeCsvRows(enrichedCsvData);
    const headers = rows[0].split(",").map(h => h.trim().toLowerCase());
    const emailIndex = headers.findIndex(h => h.includes("email"));
    if (emailIndex === -1) {
      alert("No email column found in the data.");
      return;
    }
    
    const emails = rows.slice(1).map(row => {
      const cols = row.split(",").map(col => col.trim());
      return cols[emailIndex];
    }).filter(email => email);
    
    if (emails.length === 0) {
      alert("No emails found to send.");
      return;
    }
    console.log("Emails to send:", emails);
    window.electronAPI.navigateTo("emails.html");

  });