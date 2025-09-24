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
  return rows.slice(1).map((line) => {
    const [name, domain, organization, linkedin] = line.split(",");
    return {
      name: name?.trim(),
      organization_name: organization?.trim(),
      linkedin_url: linkedin?.trim(),
    };
  });
}

/**
 * Build Apollo API request pieces (url, headers, body) using details.
 */
function buildApolloRequest(details) {
  const url =
    "https://api.apollo.io/api/v1/people/bulk_match?reveal_personal_emails=false&reveal_phone_number=false";
  const headers = {
    accept: "application/json",
    "Cache-Control": "no-cache",
    "Content-Type": "application/json",
    "x-api-key": window.env.electron_key,
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

// ------------------------------
// ZeroBounce Helpers
// ------------------------------

/**
 * Convert array of CSV rows back into a CSV string.
 */
function rowsToCsvString(rows) {
  return rows.join("\n");
}

/**
 * Build FormData for ZeroBounce bulk email finder.
 */
function buildZeroBounceFormData(csvContent) {
  const blob = new Blob([csvContent], { type: "text/csv" });

  const formData = new FormData();
  formData.append("file", blob, "enriched_data.csv");
  formData.append("api_key", window.env.zerobounce_key);
  formData.append("domain_column", "2"); // Organization column (1-indexed)
  formData.append("full_name_column", "1"); // Name column (1-indexed)
  formData.append("has_header_row", "true");

  return formData;
}

// ------------------------------
// ContactOut Helpers
// ------------------------------

/**
 * Extract LinkedIn profile URLs from CSV rows (skipping header).
 */
function extractLinkedinProfiles(rows) {
  return rows
    .slice(1)
    .map((line) => {
      const [name, domain, organization, linkedin] = line.split(",");
      return linkedin?.trim();
    })
    .filter((profile) => profile);
}

/**
 * Build ContactOut API request pieces (url, headers, body).
 */
function buildContactOutRequest(profiles) {
  const url = "https://api.contactout.com/v1/people/linkedin/batch";
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    token: `${window.env.contactout_key}`,
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

  if (data.results && Array.isArray(data.results)) {
    const headerCols = rows[0].split(",");
    const emailColumnIndex = headerCols.indexOf("ContactOut Email");

    data.results.forEach((result, index) => {
      const dataRowIndex = index + 1; // Skip header row
      if (dataRowIndex < rows.length) {
        const email = result.email || result.emails?.[0] || "";
        const currentRow = rows[dataRowIndex].split(",");

        if (emailColumnIndex !== -1) {
          // Update existing "ContactOut Email" column
          currentRow[emailColumnIndex] = email;
          rows[dataRowIndex] = currentRow.join(",");
        } else {
          // Fallback: add new column at end (shouldn't happen due to ensureHeader above)
          rows[dataRowIndex] = rows[dataRowIndex] + "," + email;
        }
      }
    });
  }

  return rows;
}

function applyZeroBounceResultsToCsv(originalRows, data) {
  let rows = [...originalRows];

  // Ensure "ZeroBounce Email" column exists
  rows = ensureHeader(rows, "ZeroBounce Email");

  if (data.results && Array.isArray(data.results)) {
    const headerCols = rows[0].split(",");
    const emailColumnIndex = headerCols.indexOf("ZeroBounce Email");

    data.results.forEach((result, index) => {
      const dataRowIndex = index + 1; // Skip header row
      if (dataRowIndex < rows.length) {
        const email = result.email || result.emails?.[0] || "";
        const currentRow = rows[dataRowIndex].split(",");

        if (emailColumnIndex !== -1) {
          // Update existing "ZeroBounce Email" column
          currentRow[emailColumnIndex] = email;
          rows[dataRowIndex] = currentRow.join(",");
        } else {
          // Fallback: add new column at end (shouldn't happen due to ensureHeader above)
          rows[dataRowIndex] = rows[dataRowIndex] + "," + email;
        }
      }
    });
  }

  return rows;
}

// ------------------------------
// Apollo Button Handler
// ------------------------------

document.getElementById("apollo-button").addEventListener("click", function () {
  if (!csvRows.length) {
    alert("Load a CSV first");
    return;
  }

  const details = getApolloDetailsFromCsvRows(csvRows);
  console.log("Apollo clicked with details:", details);

  const { url, headers, body } = buildApolloRequest(details);

  fetch(url, { method: "POST", headers, body })
    .then((response) => response.json())
    .then((data) => {
      console.log("Success:", data);

      // Normalize response to a matches list (array)
      const matchesList = Array.isArray(data) ? data : data.matches || [];

      // Create enriched CSV with Apollo emails (preserves existing logic)
      enrichedCsvData = applyApolloMatchesToCsv(csvRows, matchesList);

      // Render table from enriched data
      displayCsvAsTable(enrichedCsvData);

      // Show list of found emails
      const emails = extractEmailsFromMatches(matchesList);
      const emailText =
        emails.length > 0 ? emails.join(", ") : "No emails found";
      console.log(emailText);
      replaceText("apollo-data", emailText);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
});

// ------------------------------
// ZeroBounce Button Handler
// ------------------------------

document
  .getElementById("zero-bounce-button")
  .addEventListener("click", function () {
    if (!enrichedCsvData.length) {
      alert(
        "No CSV data available. Please load and process data with Apollo first."
      );
      return;
    }

    const csvContent = rowsToCsvString(enrichedCsvData);
    const formData = buildZeroBounceFormData(csvContent);
    const url = "https://bulkapi.zerobounce.net/email-finder/sendfile";

    fetch(url, {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Zero Bounce Success:", data);
        enrichedCsvData = applyZeroBounceResultsToCsv(enrichedCsvData, data);
        displayCsvAsTable(enrichedCsvData);
        if (data.success) {
          document.getElementById(
            "zero-bounce-data"
          ).innerText = `File submitted successfully. File ID: ${data.file_id}`;
        } else {
          document.getElementById("zero-bounce-data").innerText = `Error: ${
            data.error_message || data.message
          }`;
        }
      })
      .catch((error) => {
        console.error("Zero Bounce Error:", error);
        document.getElementById("zero-bounce-data").innerText =
          "Error submitting file to Zero Bounce";
      });

    console.log("Zero Bounce clicked");
  });

// ------------------------------
// ContactOut Button Handler
// ------------------------------

document
  .getElementById("contact-out-button")
  .addEventListener("click", function () {
    if (!csvRows.length) {
      alert("Load a CSV first");
      return;
    }

    const profiles = extractLinkedinProfiles(csvRows);
    const { url, headers, body } = buildContactOutRequest(profiles);

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

        // Initialize enriched data if needed
        if (!enrichedCsvData.length) {
          enrichedCsvData = [...csvRows];
        }

        // Apply ContactOut results and update the enriched CSV
        enrichedCsvData = applyContactOutResultsToCsv(enrichedCsvData, data);

        // Render the table
        displayCsvAsTable(enrichedCsvData);

        document.getElementById("contact-out-data").innerText = data.message;
      })
      .catch((error) => {
        console.error("ContactOut Error:", error);
        document.getElementById(
          "contact-out-data"
        ).innerText = `Error: ${error.message}`;
      });
  });
