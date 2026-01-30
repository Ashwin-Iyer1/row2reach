/**
 * Event Handlers Module
 * Manages button click handlers and page events
 */

import {
  normalizeCsvRows,
  rowsToCsvString,
  extractEmailsFromCsv as extractEmails,
} from "../utils/csv-utils.js";
import { getCsvRows, getEnrichedCsvData } from "../state/app-state.js";
import { fetchApollo } from "../api/apollo-api.js";
import { fetchZeroBounce } from "../api/zerobounce-api.js";
import { fetchContactOut } from "../api/contactout-api.js";

/**
 * Validate CSV data is loaded before proceeding.
 * @returns {boolean} True if CSV data exists
 */
export function validateCsvLoaded() {
  if (!getCsvRows().length) {
    alert("Load a CSV first");
    return false;
  }
  return true;
}

/**
 * Download enriched CSV data as a file.
 */
export function downloadCsvFile() {
  const enrichedCsvData = getEnrichedCsvData();
  const csvRows = getCsvRows();
  
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
}

/**
 * Navigate to email sending page with prepared data.
 */
export function navigateToEmailPage() {
  console.log("Email Users clicked");

  const enrichedCsvData = getEnrichedCsvData();
  
  if (!enrichedCsvData || enrichedCsvData.length === 0) {
    alert("No enriched data to email.");
    return;
  }

  const emails = extractEmails(enrichedCsvData);
  if (!emails) {
    alert("No emails found to send.");
    return;
  }

  console.log("Emails to send:", emails);

  try {
    const rows = normalizeCsvRows(enrichedCsvData);
    localStorage.setItem("emails", JSON.stringify(emails));
    localStorage.setItem("emailsAsCsv", rows.join("\n"));
    window.electronAPI.navigateTo("emails.html");
  } catch (err) {
    console.error("Failed to prepare emails/navigation:", err);
    alert("Failed to prepare emails. See console for details.");
  }
}

/**
 * Initialize all button event listeners.
 */
export function initializeEventListeners() {
  // Apollo button
  document
    .getElementById("apollo-button")
    .addEventListener("click", function () {
      if (!validateCsvLoaded()) return;
      fetchApollo();
    });

  // ZeroBounce button
  document
    .getElementById("zero-bounce-button")
    .addEventListener("click", function () {
      if (!validateCsvLoaded()) return;
      fetchZeroBounce();
    });

  // Fetch All button
  document
    .getElementById("fetch-all-button")
    .addEventListener("click", function () {
      if (!validateCsvLoaded()) return;
      fetchApollo();
      fetchZeroBounce();
      // fetchContactOut();
    });

  // Download CSV button
  document
    .getElementById("download-csv-button")
    .addEventListener("click", downloadCsvFile);

  // Email Users button
  document
    .getElementById("email-users-button")
    .addEventListener("click", navigateToEmailPage);
}

/**
 * Initialize page load handler.
 */
export function initializePageLoadHandler(setEnrichedCsvData, setCsvRows, displayCsvAsTable, onUpdate) {
  window.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("emailsAsCsv")) {
      const localData = localStorage.getItem("emailsAsCsv");
      const enrichedData = normalizeCsvRows(localData);
      
      // Update both state variables
      setEnrichedCsvData(enrichedData);
      setCsvRows(enrichedData);
      
      // Render table with update callback
      displayCsvAsTable(enrichedData, normalizeCsvRows, onUpdate);
    }
  });
}
