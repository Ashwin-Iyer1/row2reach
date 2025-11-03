// ------------------------------
// CSV Table Rendering Utilities
// ------------------------------
/**
 * Normalize CSV input to an array of non-empty row strings.
 * Accepts either a CSV string or an array of rows and filters out empty lines.
 */
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

  // guard element existence to avoid runtime exceptions that stop listeners
  const download_csv_button = document.getElementById("download-csv-button");
  const email_users_button = document.getElementById("email-users-button");

  if (email_users_button) {
    email_users_button.style.display = "inline-block"; // Show email users button
  } else {
    console.warn("email-users-button element not found");
  }

  if (download_csv_button) {
    download_csv_button.style.display = "inline-block"; // Show download button
  } else {
    console.warn("download-csv-button element not found");
  }
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
  console.log("CSV rows updated:", enrichedCsvData);
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

  const headers = rows[0].split(",").map((h) => h.trim().toLowerCase());

  // Find column indices by looking for keywords
  const nameIndex = headers.findIndex((h) => h.includes("name"));
  const organizationIndex = headers.findIndex((h) =>
    h.includes("organization")
  );
  const linkedinIndex = headers.findIndex((h) => h.includes("linkedin"));

  return rows.slice(1).map((line) => {
    const columns = line.split(",").map((col) => col.trim());

    return {
      name: nameIndex >= 0 ? columns[nameIndex] : undefined,
      organization_name:
        organizationIndex >= 0 ? columns[organizationIndex] : undefined,
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
  let object;
  try {
    object = await window.electronAPI.getKeys();
  } catch (err) {
    console.error("Error getting keys for Apollo:", err);
    throw new Error(
      "Failed to read stored keys for Apollo. Please check your app configuration."
    );
  }

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

  const headers = rows[0].split(",").map((h) => h.trim().toLowerCase());

  const linkedinIndex = headers.findIndex((h) => h.includes("linkedin"));

  return rows
    .slice(1)
    .map((line) => {
      const columns = line.split(",").map((col) => col.trim());
      return linkedinIndex >= 0 ? columns[linkedinIndex] : undefined;
    })
    .filter((profile) => profile);
}

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

  if (data.profiles && typeof data.profiles === "object") {
    const headerCols = rows[0].split(",");
    const emailColumnIndex = headerCols.indexOf("ContactOut Email");
    const linkedinColumnIndex = headerCols.findIndex((header) =>
      header.toLowerCase().includes("linkedin")
    );

    // Process each data row (skip header)
    for (let i = 1; i < rows.length; i++) {
      const currentRow = rows[i].split(",");

      if (
        linkedinColumnIndex !== -1 &&
        linkedinColumnIndex < currentRow.length
      ) {
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
  const apolloEl = document.getElementById("apollo-data");
  apolloEl.innerText = "Loading...";
  const details = getApolloDetailsFromCsvRows(csvRows);
  console.log("Apollo clicked with details:", details);

  let req;
  try {
    req = await buildApolloRequest(details);
  } catch (err) {
    console.error("Failed to build Apollo request:", err);
    apolloEl.innerText = err.message || "Failed to build Apollo request";
    return;
  }

  try {
    const response = await fetch(req.url, {
      method: "POST",
      headers: req.headers,
      body: req.body,
    });
    const data = await response.json();

    if (data.error) {
      replaceText("apollo-data", data.error);
      return;
    }

    console.log("Success:", data);

    const matchesList = Array.isArray(data) ? data : data.matches || [];
    enrichedCsvData = applyApolloMatchesToCsv(csvRows, matchesList);

    displayCsvAsTable(enrichedCsvData);

    const emails = extractEmailsFromMatches(matchesList);
    const emailText = emails.length > 0 ? emails.join(", ") : "No emails found";
    console.log(emailText);
    replaceText("apollo-data", emailText);
  } catch (error) {
    console.error("Apollo request error:", error);
    apolloEl.innerText = `Error: ${error.message}`;
  }
}
document.getElementById("apollo-button").addEventListener("click", function () {
  if (!csvRows.length) {
    alert("Load a CSV first");
    return;
  }

  fetchApollo();
});

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
async function buildZeroBounceFormData(csvContent) {
  const blob = new Blob([csvContent], { type: "text/csv" });

  // 🔑 fetch key from preload storage
  const object = await window.electronAPI.getKeys();
  console.log("Using ZeroBounce key:", object.ZEROBOUNCE_KEY);

  const formData = new FormData();
  formData.append("file", blob, "enriched_data.csv");
  formData.append("api_key", object.ZEROBOUNCE_KEY);
  formData.append("domain_column", "2"); // Organization column (1-indexed)
  formData.append("full_name_column", "1"); // Name column (1-indexed)
  formData.append("has_header_row", "true");

  return formData;
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

async function fetchZeroBounce() {
  document.getElementById("zero-bounce-data").innerText = "Loading...";
  let object;
  try {
    object = await window.electronAPI.getKeys();
  } catch (err) {
    console.error("Error getting keys for Zero Bounce:", err);
    document.getElementById(
      "zero-bounce-data"
    ).innerText = `Failed to read stored keys for Zero Bounce. Please check your app configuration.`;
    return;
  }

  const csvContent = rowsToCsvString(csvRows);

  // ✅ await formData builder
  const formData = await buildZeroBounceFormData(csvContent);

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

        // wait for some time and then fetch results
        fetch(
          `https://bulkapi.zerobounce.net/v2/getfile?api_key=${object.ZEROBOUNCE_KEY}&file_id=${data.file_id}`
        )
          .then((response) => response.json())
          .then((resultData) => {
            console.log("Zero Bounce Result Data:", resultData);
            enrichedCsvData = applyZeroBounceResultsToCsv(
              enrichedCsvData,
              resultData
            );
            displayCsvAsTable(enrichedCsvData);
            if (resultData.success) {
              document.getElementById(
                "zero-bounce-data"
              ).innerText = `Zero Bounce results fetched successfully.`;
            } else {
              document.getElementById(
                "zero-bounce-data"
              ).innerText = `Error fetching results: ${
                resultData.error_message || resultData.message
              }`;
            }
          })

          .catch((error) => {
            console.error("Error fetching Zero Bounce results:", error);
          });
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
}

document
  .getElementById("zero-bounce-button")
  .addEventListener("click", function () {
    if (!csvRows.length) {
      alert("Load a CSV first");
      return;
    }

    fetchZeroBounce();
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

// document
//   .getElementById("contact-out-button")
//   .addEventListener("click", function () {
//     if (!csvRows.length) {
//       alert("Load a CSV first");
//       return;
//     }
//     fetchContactOut();
//   });

document
  .getElementById("fetch-all-button")
  .addEventListener("click", function () {
    if (!csvRows.length) {
      alert("Load a CSV first");
      return;
    }
    fetchApollo();
    fetchZeroBounce();
    // fetchContactOut();
  });

document
  .getElementById("download-csv-button")
  .addEventListener("click", function () {
    // Choose enrichedCsvData if present, otherwise fall back to original csvRows
    const csvString =
      enrichedCsvData && enrichedCsvData.length
        ? rowsToCsvString(enrichedCsvData)
        : rowsToCsvString(csvRows);

    if (!csvString) {
      console.warn("No CSV data available to download");
      alert("No CSV data available to download");
      return;
    }

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
    console.log("Email Users clicked");
    if (!enrichedCsvData || enrichedCsvData.length === 0) {
      alert("No enriched data to email.");
      return;
    }

    // Normalize to rows array
    const rows = normalizeCsvRows(enrichedCsvData);
    if (!rows || rows.length < 2) {
      alert("No enriched data to email.");
      return;
    }

    const headers = rows[0].split(",").map((h) => h.trim().toLowerCase());
    const emailIndex = headers.findIndex((h) => h.includes("email"));
    if (emailIndex === -1) {
      alert("No email column found in the data.");
      return;
    }

    const emails = rows
      .slice(1)
      .map((row) => {
        const cols = row.split(",").map((col) => col.trim());
        return cols[emailIndex];
      })
      .filter((email) => email);

    if (emails.length === 0) {
      alert("No emails found to send.");
      return;
    }

    console.log("Emails to send:", emails);

    try {
      // store emails as JSON
      localStorage.setItem("emails", JSON.stringify(emails));
      // store CSV as newline-separated string (preserve rows)
      localStorage.setItem("emailsAsCsv", rows.join("\n"));
      window.electronAPI.navigateTo("emails.html");
    } catch (err) {
      console.error("Failed to prepare emails/navigation:", err);
      alert("Failed to prepare emails. See console for details.");
    }
  });

window.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("emailsAsCsv")) {
    const localData = localStorage.getItem("emailsAsCsv");
    enrichedCsvData = normalizeCsvRows(localData);
    displayCsvAsTable(enrichedCsvData);
  }
});
