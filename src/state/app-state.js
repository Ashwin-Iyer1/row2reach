/**
 * Application State Module
 * Manages global application state
 */

export let csvRows = [];
export let enrichedCsvData = [];

/**
 * Update CSV rows state
 * @param {string[]} rows - New CSV rows
 */
export function setCsvRows(rows) {
  csvRows = rows;
}

/**
 * Get current CSV rows
 * @returns {string[]} Current CSV rows
 */
export function getCsvRows() {
  return csvRows;
}

/**
 * Update enriched CSV data state
 * @param {string[]} data - New enriched CSV data
 */
export function setEnrichedCsvData(data) {
  enrichedCsvData = data;
}

/**
 * Get current enriched CSV data
 * @returns {string[]} Current enriched CSV data
 */
export function getEnrichedCsvData() {
  return enrichedCsvData;
}

/**
 * Initialize state listener for CSV row updates
 */
export function initializeStateListeners() {
  window.addEventListener("csv:rows-updated", (e) => {
    csvRows = e.detail;
    enrichedCsvData = [...csvRows];
    console.log("CSV rows updated:", enrichedCsvData);
  });
}
