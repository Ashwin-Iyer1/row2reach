/**
 * ZeroBounce API Module
 * Handles ZeroBounce API integration for email finding
 */

import { ensureHeader, rowsToCsvString } from "../utils/csv-utils.js";
import { replaceText, getElementSafely } from "../utils/dom-utils.js";
import { displayCsvAsTable } from "../utils/table-builder.js";
import { normalizeCsvRows } from "../utils/csv-utils.js";
import {
  getCsvRows,
  getEnrichedCsvData,
  setEnrichedCsvData,
} from "../state/app-state.js";

/**
 * Build FormData for ZeroBounce bulk email finder.
 * @param {string} csvContent - CSV content as string
 * @returns {Promise<FormData>} FormData object ready for API submission
 */
export async function buildZeroBounceFormData(csvContent) {
  // Parse the CSV to extract only the required columns
  const lines = csvContent.trim().split('\n');
  if (lines.length < 1) {
    throw new Error('CSV content is empty');
  }
  
  // Parse header row
  const headers = lines[0].split(',').map(h => h.trim());
  
  // Find the indices of required columns
  const fullNameIndex = headers.findIndex(h => h === 'Full Name' || h === '"Full Name"');
  const domainIndex = headers.findIndex(h => h === 'Domain' || h === '"Domain"');
  const linkedinIndex = headers.findIndex(h => h === 'Linkedin URL' || h === '"Linkedin URL"');
  
  if (fullNameIndex === -1 || domainIndex === -1) {
    throw new Error('Required columns (Full Name, Domain) not found in CSV');
  }
  
  // Build new CSV with only the required columns
  const filteredLines = [];
  
  // Add header
  if (linkedinIndex !== -1) {
    filteredLines.push('Full Name,Domain,Linkedin URL');
  } else {
    filteredLines.push('Full Name,Domain');
  }
  
  // Add data rows
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    if (linkedinIndex !== -1) {
      filteredLines.push(`${cols[fullNameIndex]},${cols[domainIndex]},${cols[linkedinIndex]}`);
    } else {
      filteredLines.push(`${cols[fullNameIndex]},${cols[domainIndex]}`);
    }
  }
  
  const filteredCsvContent = filteredLines.join('\n');
  console.log('Filtered CSV for ZeroBounce:', filteredCsvContent);
  
  const blob = new Blob([filteredCsvContent], { type: "text/csv" });

  const object = await window.electronAPI.getKeys();
  console.log("Using ZeroBounce key:", object.ZEROBOUNCE_KEY);

  const formData = new FormData();
  formData.append("file", blob, "enriched_data.csv");
  formData.append("api_key", object.ZEROBOUNCE_KEY);
  formData.append("domain_column", "2");
  formData.append("full_name_column", "1");
  formData.append("has_header_row", "true");

  return formData;
}

/**
 * Apply ZeroBounce results to CSV rows.
 * @param {string[]} originalRows - Original CSV rows
 * @param {Object} data - ZeroBounce API response data
 * @returns {string[]} Updated CSV rows with ZeroBounce emails
 */
export function applyZeroBounceResultsToCsv(originalRows, data) {
  let rows = [...originalRows];
  rows = ensureHeader(rows, "ZeroBounce Email");

  if (data.results && Array.isArray(data.results)) {
    const headerCols = rows[0].split(",");
    const emailColumnIndex = headerCols.indexOf("ZeroBounce Email");

    data.results.forEach((result, index) => {
      const dataRowIndex = index + 1;
      if (dataRowIndex < rows.length) {
        // Try multiple possible email field names from ZeroBounce CSV
        const email = result['ZB Email'] || result.email || result.Email || 
                      result.emails?.[0] || result['Email Address'] || 
                      result['email_address'] || "";
        const currentRow = rows[dataRowIndex].split(",");

        // Ensure we have enough columns
        while (currentRow.length <= emailColumnIndex) {
          currentRow.push("");
        }

        if (emailColumnIndex !== -1 && emailColumnIndex < currentRow.length) {
          currentRow[emailColumnIndex] = email;
          rows[dataRowIndex] = currentRow.join(",");
        } else {
          // Fallback: append to end if column index not found
          rows[dataRowIndex] = rows[dataRowIndex] + "," + email;
        }
      }
    });
  }

  return rows;
}

/**
 * Submit CSV file to ZeroBounce API.
 * @param {FormData} formData - Prepared form data
 * @returns {Promise<Object>} API response data
 */
async function submitZeroBounceFile(formData) {
  const url = "https://bulkapi.zerobounce.net/email-finder/sendfile";
  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });
  return response.json();
}

/**
 * Parse a CSV line handling quoted fields properly.
 * @param {string} line - CSV line to parse
 * @returns {string[]} Array of field values
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  
  return result;
}

/**
 * Fetch ZeroBounce results by file ID.
 * @param {string} apiKey - ZeroBounce API key
 * @param {string} fileId - File ID from submission
 * @returns {Promise<Object>} Result data with CSV parsed into results array
 */
async function fetchZeroBounceResults(apiKey, fileId) {
  const url = `https://bulkapi.zerobounce.net/email-finder/getfile?api_key=${apiKey}&file_id=${fileId}`;
  const response = await fetch(url);
  
  // Check if the response is successful
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  // Get the response as text (CSV)
  const csvText = await response.text();
  
  // Check if it's an error response (might be JSON)
  if (csvText.startsWith('{')) {
    try {
      return JSON.parse(csvText);
    } catch (e) {
      throw new Error('Invalid response from ZeroBounce API');
    }
  }
  
  // Parse CSV into results array
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    return { success: false, error_message: 'No results found' };
  }
  
  const headers = parseCSVLine(lines[0]);
  const results = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    results.push(row);
  }
  
  return {
    success: true,
    results: results
  };
}

/**
 * Handle ZeroBounce result data and update UI.
 * @param {Object} resultData - Result data from API
 */
function handleZeroBounceResults(resultData) {
  console.log("Zero Bounce Result Data:", resultData);
  const currentData = getEnrichedCsvData();
  const updatedData = applyZeroBounceResultsToCsv(currentData, resultData);
  setEnrichedCsvData(updatedData);
  displayCsvAsTable(updatedData, normalizeCsvRows);

  if (resultData.success) {
    replaceText(
      "zero-bounce-data",
      "Zero Bounce results fetched successfully."
    );
  } else {
    replaceText(
      "zero-bounce-data",
      `Error fetching results: ${
        resultData.error_message || resultData.message
      }`
    );
  }
}

/**
 * Main ZeroBounce fetch function.
 */
export async function fetchZeroBounce() {
  const zbEl = getElementSafely("zero-bounce-data");
  if (!zbEl) return;

  zbEl.innerText = "Loading...";

  let apiKey;
  try {
    const keys = await window.electronAPI.getKeys();
    apiKey = keys.ZEROBOUNCE_KEY;
  } catch (err) {
    console.error("Error getting keys for Zero Bounce:", err);
    zbEl.innerText =
      "Failed to read stored keys for Zero Bounce. Please check your app configuration.";
    return;
  }

  try {
    const csvRows = getCsvRows();
    const csvContent = rowsToCsvString(csvRows);
    const formData = await buildZeroBounceFormData(csvContent);

    const data = await submitZeroBounceFile(formData);
    console.log("Zero Bounce Success:", data);

    const currentData = getEnrichedCsvData();
    const updatedData = applyZeroBounceResultsToCsv(currentData, data);
    setEnrichedCsvData(updatedData);
    displayCsvAsTable(updatedData, normalizeCsvRows);

    if (data.success) {
      zbEl.innerText = `File submitted successfully. File ID: ${data.file_id}`;

      try {
        var tries = 0;
        var resultData = null;
        const maxTries = 10; // Try for up to 25 seconds (5 * 5s)
        
        while (tries < maxTries) {
          zbEl.innerText = `Waiting for results... Attempt ${tries + 1}/${maxTries}`;
          await new Promise((resolve) => setTimeout(resolve, 5000));
          
          try {
            resultData = await fetchZeroBounceResults(apiKey, data.file_id);
            // If we got valid data with success status, break out
            if (resultData && resultData.success) {
              break;
            }
          } catch (fetchError) {
            // If it's a JSON parse error, the file might not be ready yet
            console.log(`Attempt ${tries + 1}: Results not ready yet`);
          }
          
          tries++;
        }
        
        if (resultData && resultData.success) {
          handleZeroBounceResults(resultData);
        } else {
          zbEl.innerText = "Timeout waiting for Zero Bounce results. Please try again later.";
        }
      } catch (error) {
        console.error("Error fetching Zero Bounce results:", error);
        zbEl.innerText = "Error fetching Zero Bounce results";
      }
    } else {
      zbEl.innerText = `Error: ${data.error_message || data.message}`;
    }
  } catch (error) {
    console.error("Zero Bounce Error:", error);
    zbEl.innerText = "Error submitting file to Zero Bounce";
  }
}
