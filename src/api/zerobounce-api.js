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
  const blob = new Blob([csvContent], { type: "text/csv" });

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
        const email = result.email || result.emails?.[0] || "";
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
 * Fetch ZeroBounce results by file ID.
 * @param {string} apiKey - ZeroBounce API key
 * @param {string} fileId - File ID from submission
 * @returns {Promise<Object>} Result data
 */
async function fetchZeroBounceResults(apiKey, fileId) {
  const url = `https://bulkapi.zerobounce.net/v2/getfile?api_key=${apiKey}&file_id=${fileId}`;
  const response = await fetch(url);
  return response.json();
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
        const resultData = await fetchZeroBounceResults(apiKey, data.file_id);
        handleZeroBounceResults(resultData);
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
