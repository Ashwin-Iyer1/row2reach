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
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      // Keep the quote in 'current' so we can strip it strictly if it surrounds the whole token later
      // OR we can choose to handle it here.
      // Standard CSV: quotes are part of the value unless they are delimiters.
      // Let's keep specific simple logic: just toggle state.
      current += char;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  // Clean up quotes: strict check if start/end with quotes, then remove them.
  // Also handle double quotes escaping if needed, but for now simple removal of surrounding quotes.
  return result.map((col) => {
    if (col.startsWith('"') && col.endsWith('"')) {
      // Remove first and last quote
      let inner = col.slice(1, -1);
      // If inner has escaped quotes (DOUBLE quotes ""), replace with single quote usually.
      // But user input might just be simple quotes.
      // Let's simpler: just return inner.
      return inner.trim();
    }
    return col;
  });
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
 * Find all column indices that contain a keyword.
 * @param {string[]} headers - Array of header names
 * @param {string} keyword - Keyword to search for
 * @returns {number[]} Array of column indices
 */
export function findAllColumnIndices(headers, keyword) {
  const indices = [];
  headers.forEach((h, index) => {
    if (h.includes(keyword.toLowerCase())) {
      indices.push(index);
    }
  });
  return indices;
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
 * Searches all columns containing "email" and returns the first non-empty value for each row.
 * @param {string[]} enrichedCsvData - Enriched CSV data
 * @returns {string[]|null} Array of emails or null if none found
 */
export function extractEmailsFromCsv(enrichedCsvData) {
  const rows = normalizeCsvRows(enrichedCsvData);
  if (!rows || rows.length < 2) {
    return null;
  }

  const headers = parseHeaders(rows[0]);
  const emailIndices = findAllColumnIndices(headers, "email");

  if (emailIndices.length === 0) {
    alert("No email column found in the data.");
    return null;
  }

  console.log(`Found ${emailIndices.length} email column(s):`, 
    emailIndices.map(idx => headers[idx]));

  const emailSet = new Set();
  
  rows.slice(1).forEach((row) => {
    const cols = parseRowColumns(row);
    // Try each email column and collect all non-empty values
    for (const index of emailIndices) {
      const cellValue = cols[index]?.trim();
      if (cellValue) {
        // Split by comma or semicolon to handle multiple emails in one cell
        const parts = cellValue.split(/[;,]/).map(e => e.trim()).filter(e => e);
        parts.forEach(email => emailSet.add(email));
      }
    }
  });

  const emails = Array.from(emailSet);
  return emails.length > 0 ? emails : null;
}
