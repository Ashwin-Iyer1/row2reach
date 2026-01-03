/**
 * Table Builder Module
 * Handles HTML table construction and rendering
 */

import { parseRowColumns } from "./csv-utils.js";
import { toggleButtonVisibility } from "./dom-utils.js";

/**
 * Create a table header row element from header strings.
 * @param {string[]} headers - Array of header strings
 * @returns {HTMLTableSectionElement} Table thead element
 */
export function createTableHeader(headers) {
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  headers.forEach((headerText) => {
    const th = document.createElement("th");
    th.textContent = headerText.trim();
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  return thead;
}

/**
 * Create a single table row element.
 * @param {string[]} cellData - Array of cell values
 * @returns {HTMLTableRowElement} Table row element
 */
export function createTableRow(cellData) {
  const tr = document.createElement("tr");

  cellData.forEach((data) => {
    const td = document.createElement("td");
    td.textContent = data;
    tr.appendChild(td);
  });

  return tr;
}

/**
 * Create a table body with data rows.
 * @param {string[]} rows - Array of CSV rows (excluding header)
 * @returns {HTMLTableSectionElement} Table tbody element
 */
export function createTableBody(rows) {
  const tbody = document.createElement("tbody");

  for (let i = 1; i < rows.length; i++) {
    const rowData = parseRowColumns(rows[i]);
    const tr = createTableRow(rowData);
    tbody.appendChild(tr);
  }

  return tbody;
}

/**
 * Build a complete table element from CSV rows (first row is header).
 * @param {string[]} rows - Array of CSV rows
 * @returns {HTMLTableElement} Complete table element
 */
export function buildTableFromRows(rows) {
  const table = document.createElement("table");
  table.border = "1";

  const headers = parseRowColumns(rows[0]);
  table.appendChild(createTableHeader(headers));
  table.appendChild(createTableBody(rows));

  return table;
}

/**
 * Render a table into the container element.
 * @param {HTMLTableElement} table - Table element to render
 */
export function renderTable(table) {
  const container = document.getElementById("table-container");
  container.innerHTML = ""; // Clear previous content
  container.appendChild(table);

  // Show action buttons after table is rendered
  toggleButtonVisibility("email-users-button", true);
  toggleButtonVisibility("download-csv-button", true);
  toggleButtonVisibility("merge-csv-button", true);
}

/**
 * Dispatch a custom event that CSV rows have been updated.
 * @param {string[]} rows - Updated CSV rows
 */
export function dispatchCsvRowsUpdated(rows) {
  window.dispatchEvent(new CustomEvent("csv:rows-updated", { detail: rows }));
}

/**
 * Public function to display CSV as a table.
 * Accepts CSV string or array, normalizes, dispatches event, and renders table.
 * @param {string|string[]} csv - CSV content
 */
export function displayCsvAsTable(csv, normalizeCsvRows) {
  const rows = normalizeCsvRows(csv);
  if (rows.length === 0) return;

  dispatchCsvRowsUpdated(rows);
  const table = buildTableFromRows(rows);
  renderTable(table);
}
