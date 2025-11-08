/**
 * ContactOut API Module
 * Handles ContactOut API integration for LinkedIn profile enrichment
 */

import {
  parseHeaders,
  findColumnIndex,
  parseRowColumns,
  ensureHeader,
} from "../utils/csv-utils.js";
import { getElementSafely } from "../utils/dom-utils.js";
import { displayCsvAsTable } from "../utils/table-builder.js";
import { normalizeCsvRows } from "../utils/csv-utils.js";
import {
  getCsvRows,
  getEnrichedCsvData,
  setEnrichedCsvData,
} from "../state/app-state.js";

/**
 * Extract LinkedIn profile URLs from CSV rows.
 * @param {string[]} rows - Array of CSV rows
 * @returns {string[]} Array of LinkedIn profile URLs
 */
export function extractLinkedinProfiles(rows) {
  if (rows.length < 2) return [];

  const headers = parseHeaders(rows[0]);
  const linkedinIndex = findColumnIndex(headers, "linkedin");

  return rows
    .slice(1)
    .map((line) => {
      const columns = parseRowColumns(line);
      return linkedinIndex >= 0 ? columns[linkedinIndex] : undefined;
    })
    .filter((profile) => profile);
}

/**
 * Build ContactOut API request configuration.
 * @param {string[]} profiles - Array of LinkedIn profile URLs
 * @returns {Promise<Object>} Request configuration object
 */
export async function buildContactOutRequest(profiles) {
  const url = "https://api.contactout.com/v1/people/linkedin/batch";

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
 * Apply ContactOut results to CSV rows.
 * @param {string[]} originalRows - Original CSV rows
 * @param {Object} data - ContactOut API response data
 * @returns {string[]} Updated CSV rows with ContactOut emails
 */
export function applyContactOutResultsToCsv(originalRows, data) {
  let rows = [...originalRows];
  rows = ensureHeader(rows, "ContactOut Email");

  if (data.profiles && typeof data.profiles === "object") {
    const headerCols = rows[0].split(",");
    const emailColumnIndex = headerCols.indexOf("ContactOut Email");
    const linkedinColumnIndex = headerCols.findIndex((header) =>
      header.toLowerCase().includes("linkedin")
    );

    for (let i = 1; i < rows.length; i++) {
      const currentRow = rows[i].split(",");

      if (
        linkedinColumnIndex !== -1 &&
        linkedinColumnIndex < currentRow.length
      ) {
        const linkedinUrl = currentRow[linkedinColumnIndex].trim();
        const emails = data.profiles[linkedinUrl] || [];
        const email = emails.length > 0 ? emails[0] : "";

        // Ensure we have enough columns
        while (currentRow.length <= emailColumnIndex) {
          currentRow.push("");
        }

        if (emailColumnIndex !== -1 && emailColumnIndex < currentRow.length) {
          currentRow[emailColumnIndex] = email;
          rows[i] = currentRow.join(",");
        } else {
          // Fallback: append to end if column index not found
          rows[i] = rows[i] + "," + email;
        }
      }
    }
  }

  return rows;
}

/**
 * Main ContactOut fetch function.
 */
export async function fetchContactOut() {
  const coEl = getElementSafely("contact-out-data");
  if (!coEl) return;

  const csvRows = getCsvRows();
  const profiles = extractLinkedinProfiles(csvRows);
  coEl.innerText = "Loading...";

  try {
    const { url, headers, body } = await buildContactOutRequest(profiles);

    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("ContactOut Success:", data);

    let enrichedCsvData = getEnrichedCsvData();
    if (!enrichedCsvData.length) {
      enrichedCsvData = [...csvRows];
    }

    const updatedData = applyContactOutResultsToCsv(enrichedCsvData, data);
    setEnrichedCsvData(updatedData);
    displayCsvAsTable(updatedData, normalizeCsvRows);

    coEl.innerText = data.message || "ContactOut request completed";
  } catch (error) {
    console.error("ContactOut Error:", error);
    coEl.innerText = `Error: ${error.message}`;
  }
}
