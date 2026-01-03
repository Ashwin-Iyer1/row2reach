/**
 * Main Entry Point
 * Imports and initializes all modules
 */

import {
  initializeStateListeners,
  setEnrichedCsvData,
} from "./state/app-state.js";
import { displayCsvAsTable } from "./utils/table-builder.js";
import { normalizeCsvRows } from "./utils/csv-utils.js";
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
initializePageLoadHandler(setEnrichedCsvData, displayCsvAsTable);

// Export displayCsvAsTable for use by file-input.js
window.displayCsvAsTable = (csv) => {
  displayCsvAsTable(csv, normalizeCsvRows);
};

console.log("Application initialized");
