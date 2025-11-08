/**
 * CSV Utilities Module
 * Handles CSV parsing, normalization, and manipulation
 */

/**
 * Normalize CSV input to an array of non-empty row strings.
 * Accepts either a CSV string or an array of rows and filters out empty lines.
 * @param {string|string[]} csv - CSV content as string or array of rows
 * @returns {string[]} Normalized array of row strings
 */
export function normalizeCsvRows(csv) {
  let rows = Array.isArray(csv)
    ? csv.filter((row) => row.trim() !== "")
    : csv.split(/\r?\n/).filter((row) => row.trim() !== "");

  // Fix for malformed one-liner input
  if (shouldFixOneLinerCsv(rows)) {
    rows = fixOneLinerCsv(rows[0]);
  }

  return rows;
}

/**
 * Check if CSV is a malformed one-liner that needs fixing.
 * @param {string[]} rows - Array of CSV rows
 * @returns {boolean}
 */
function shouldFixOneLinerCsv(rows) {
  return rows.length === 1 && rows[0].includes("ContactOut Email,");
}

/**
 * Fix a malformed one-liner CSV by splitting it into proper rows.
 * @param {string} oneLiner - Single-line CSV string
 * @returns {string[]} Fixed array of CSV rows
 */
function fixOneLinerCsv(oneLiner) {
  const parts = oneLiner.split(",");
  const header = parts.slice(0, 4).join(",");
  const data = parts.slice(4);

  const fixedRows = [header];
  for (let i = 0; i < data.length; i += 4) {
    const chunk = data.slice(i, i + 4);
    if (chunk.length) {
      fixedRows.push(chunk.join(","));
    }
  }
  return fixedRows;
}

/**
 * Convert array of CSV rows back into a CSV string.
 * @param {string[]} rows - Array of CSV rows
 * @returns {string} CSV string with newline separators
 */
export function rowsToCsvString(rows) {
  return rows.join("\n");
}

/**
 * Parse a CSV row into columns.
 * @param {string} row - CSV row string
 * @returns {string[]} Array of trimmed column values
 */
export function parseRowColumns(row) {
  return row.split(",").map((col) => col.trim());
}

/**
 * Parse CSV headers and convert to lowercase.
 * @param {string} headerRow - First row containing headers
 * @returns {string[]} Array of lowercase header names
 */
export function parseHeaders(headerRow) {
  return parseRowColumns(headerRow).map((h) => h.toLowerCase());
}

/**
 * Find column index by keyword match in headers.
 * @param {string[]} headers - Array of header names
 * @param {string} keyword - Keyword to search for
 * @returns {number} Column index or -1 if not found
 */
export function findColumnIndex(headers, keyword) {
  return headers.findIndex((h) => h.includes(keyword.toLowerCase()));
}

/**
 * Ensure a header exists in the first row, append if missing.
 * @param {string[]} rows - Array of CSV rows
 * @param {string} headerName - Header name to ensure exists
 * @returns {string[]} Updated rows with header ensured
 */
export function ensureHeader(rows, headerName) {
  if (!rows.length) return rows;

  const headerRow = parseRowColumns(rows[0]);
  if (!headerRow.includes(headerName)) {
    rows[0] = rows[0] + `,${headerName}`;
  }
  return rows;
}

/**
 * Set email value in a CSV row at the appropriate column index.
 * @param {string} headerRow - CSV header row string
 * @param {string} row - CSV row string
 * @param {string} email - Email value to set
 * @param {string} headerName - Name of the header column to place the email
 * @returns {string} Updated row string
 */
export function setEmailInRow(headerRow, row, email, headerName) {
  const headers = parseRowColumns(headerRow);
  const currentRow = parseRowColumns(row);
  
  // Find the index of the target column
  const targetColumnIndex = headers.indexOf(headerName);
  
  if (targetColumnIndex === -1) {
    // Header not found, append to the end
    return row + "," + email;
  }

  if (currentRow.length <= targetColumnIndex) {
    // Pad with empty columns if needed and add email
    while (currentRow.length < targetColumnIndex) {
      currentRow.push("");
    }
    currentRow.push(email);
  } else {
    // Update existing column
    currentRow[targetColumnIndex] = email;
  }
  
  return currentRow.join(",");
}

/**
 * Extract emails from enriched CSV data.
 * @param {string[]} enrichedCsvData - Enriched CSV data
 * @returns {string[]|null} Array of emails or null if none found
 */
export function extractEmailsFromCsv(enrichedCsvData) {
  const rows = normalizeCsvRows(enrichedCsvData);
  if (!rows || rows.length < 2) {
    return null;
  }

  const headers = parseHeaders(rows[0]);
  const emailIndex = findColumnIndex(headers, "email");

  if (emailIndex === -1) {
    alert("No email column found in the data.");
    return null;
  }

  const emails = rows
    .slice(1)
    .map((row) => {
      const cols = parseRowColumns(row);
      return cols[emailIndex];
    })
    .filter((email) => email);

  return emails.length > 0 ? emails : null;
}
