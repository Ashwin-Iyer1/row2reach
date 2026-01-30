/**
 * Main Entry Point
 * Imports and initializes all modules
 */

import {
  initializeStateListeners,
  setEnrichedCsvData,
  getCsvRows,
  setCsvRows,
} from "./state/app-state.js";
import { displayCsvAsTable } from "./utils/table-builder.js";
import { normalizeCsvRows, updateRowCell, rowsToCsvString } from "./utils/csv-utils.js";
import {
  initializeEventListeners,
  initializePageLoadHandler,
} from "./handlers/event-handlers.js";
import { initializeUpdateHandlers } from "./handlers/update-handler.js";
import { initializeMergeHandler } from "./handlers/merge-handler.js";

// Initialize state management
initializeStateListeners();

// Initialize event listeners
initializeEventListeners();
initializeUpdateHandlers();
initializeMergeHandler();

// Initialize page load handler
initializePageLoadHandler(setEnrichedCsvData, setCsvRows, displayCsvAsTable, handleCellUpdate);

// Export displayCsvAsTable for use by file-input.js
// Export displayCsvAsTable for use by file-input.js
window.displayCsvAsTable = (csv) => {
  const rows = normalizeCsvRows(csv);
  if (rows.length === 0) return;

  // Initial state update
  setCsvRows(rows);
  setEnrichedCsvData(rows);
  
  // Persist to localStorage
  const csvString = rowsToCsvString(rows);
  localStorage.setItem("emailsAsCsv", csvString);

  displayCsvAsTable(rows, normalizeCsvRows, handleCellUpdate);
};

/**
 * Handle updates from editable table cells
 */
function handleCellUpdate(rowIndex, colIndex, newValue) {
  const currentRows = getCsvRows();
  if (!currentRows || !currentRows[rowIndex]) return;

  // Update the specfic row string
  const newRowString = updateRowCell(currentRows[rowIndex], colIndex, newValue);
  
  // Update state array
  currentRows[rowIndex] = newRowString;
  
  // Persist to state (which updates both csvRows and enrichedCsvData via listener if we dispatched, 
  // but here we are modifying the source array that might already be ref'd. 
  // Better to dispatch or set explicitly.)
  // Since setCsvRows just updates the reference, and we mutated the array in place above (if it was a reference), 
  // let's follow the pattern of immutable updates if possible, or at least consistent updates.
  // We'll create a new array to be safe.
  const newRows = [...currentRows];
  newRows[rowIndex] = newRowString;

  setCsvRows(newRows);
  setEnrichedCsvData(newRows);

  // Sync to localStorage for Emails page
  const csvString = rowsToCsvString(newRows);
  localStorage.setItem("emailsAsCsv", csvString);
  
  console.log(`Updated cell [${rowIndex}, ${colIndex}] to: ${newValue}`);
}

console.log("Application initialized");
