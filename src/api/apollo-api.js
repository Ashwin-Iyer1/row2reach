/**
 * Apollo API Module
 * Handles Apollo.io API integration for email enrichment
 */

import {
  parseHeaders,
  findColumnIndex,
  parseRowColumns,
  ensureHeader,
  setEmailInRow,
} from "../utils/csv-utils.js";
import { replaceText, getElementSafely } from "../utils/dom-utils.js";
import { displayCsvAsTable } from "../utils/table-builder.js";
import { normalizeCsvRows } from "../utils/csv-utils.js";
import {
  getCsvRows,
  getEnrichedCsvData,
  setEnrichedCsvData,
} from "../state/app-state.js";

/**
 * Convert CSV rows (excluding header) to Apollo "details" objects.
 * @param {string[]} rows - Array of CSV rows with headers
 * @returns {Object[]} Array of Apollo detail objects
 */
export function getApolloDetailsFromCsvRows(rows) {
  if (rows.length < 2) return [];

  const headers = parseHeaders(rows[0]);

  let nameIndex = findColumnIndex(headers, "full name");
  const firstNameIndex = findColumnIndex(headers, "first name");
  const lastNameIndex = findColumnIndex(headers, "last name");
  let organizationIndex = findColumnIndex(headers, "organization");
  if (organizationIndex < 0) {
    organizationIndex = findColumnIndex(headers, "company");
  } else {
    // find ALL columns with "organization" in the header
    const matchingHeaders = headers.filter((header) =>
      header.toLowerCase().includes("organization")
    );

    // if we find more than one, use the organization with the word "previous" in it, else use the first one
    if (matchingHeaders.length > 0) {
      let chosenHeader = matchingHeaders[0];
      if (matchingHeaders.length > 1) {
        const previousOrg = matchingHeaders.find((header) =>
          header.toLowerCase().includes("previous")
        );
        if (previousOrg) {
          chosenHeader = previousOrg;
        }
      }
      organizationIndex = headers.indexOf(chosenHeader);
    }
  }
  const linkedinIndex = findColumnIndex(headers, "linkedin");
  const domainIndex = findColumnIndex(headers, "domain");

  // If we don't have a name column but have first/last name, we'll combine them
  const needsToCombineNames =
    nameIndex < 0 && (firstNameIndex >= 0 || lastNameIndex >= 0);

  return rows.slice(1).map((line) => {
    const columns = parseRowColumns(line);

    let fullName;
    if (needsToCombineNames) {
      const firstName =
        firstNameIndex >= 0 ? (columns[firstNameIndex] || "").trim() : "";
      const lastName =
        lastNameIndex >= 0 ? (columns[lastNameIndex] || "").trim() : "";
      fullName = [firstName, lastName].filter(Boolean).join(" ");
    } else {
      fullName = nameIndex >= 0 ? columns[nameIndex] : undefined;
    }

    const detail = {
      name: fullName,
      organization_name:
        organizationIndex >= 0 ? columns[organizationIndex] : undefined,
      linkedin_url:
        linkedinIndex >= 0 && columns[linkedinIndex]
          ? columns[linkedinIndex]
          : undefined,
    };

    // Add domain if it exists
    if (domainIndex >= 0 && columns[domainIndex]) {
      detail.domain = columns[domainIndex];
    }

    return detail;
  });
}

/**
 * Build Apollo API request configuration.
 * @param {Object[]} details - Array of detail objects
 * @returns {Promise<Object>} Request configuration
 */
export async function buildApolloRequest(details) {
  const url =
    "https://api.apollo.io/api/v1/people/bulk_match?reveal_personal_emails=false&reveal_phone_number=false";

  let object;
  try {
    object = await window.electronAPI.getKeys();
  } catch (err) {
    console.error("Error getting keys for Apollo:", err);
    throw new Error(
      "Failed to read stored keys for Apollo. Please check your app configuration."
    );
  }

  console.log("Using Apollo key:", object.APOLLO_KEY);
  const headers = {
    accept: "application/json",
    "Cache-Control": "no-cache",
    "Content-Type": "application/json",
    "x-api-key": object.APOLLO_KEY,
  };
  const body = JSON.stringify({ details });
  return { url, headers, body };
}

/**
 * Apply Apollo matches list to the CSV rows.
 * @param {string[]} originalRows - Original CSV rows
 * @param {Object[]} matchesList - Array of Apollo match objects
 * @returns {string[]} Updated CSV rows with Apollo emails
 */
export function applyApolloMatchesToCsv(originalRows, matchesList) {
  let rows = [...originalRows];
  rows = ensureHeader(rows, "Apollo Email");
  rows = ensureHeader(rows, "Apollo LinkedIn");

  matchesList.forEach((match, index) => {
    const dataRowIndex = index + 1;
    if (dataRowIndex < rows.length) {
      const email = match && match.email ? match.email : "";
      const userLinkedin =
        match && match.linkedin_url ? match.linkedin_url : "";
      rows[dataRowIndex] = setEmailInRow(
        rows[0],
        rows[dataRowIndex],
        email,
        "Apollo Email"
      );
      rows[dataRowIndex] = setEmailInRow(
        rows[0],
        rows[dataRowIndex],
        userLinkedin,
        "Apollo LinkedIn"
      );
    }
  });

  return rows;
}

/**
 * Apply Apollo matches to a specific chunk of CSV rows.
 * @param {string[]} originalRows - Original CSV rows
 * @param {Object[]} matchesList - Array of Apollo match objects for this chunk
 * @param {number} startDataRowIndex - Starting row index for this chunk
 * @returns {string[]} Updated CSV rows
 */
export function applyApolloMatchesToCsvChunk(
  originalRows,
  matchesList,
  startDataRowIndex
) {
  let rows = [...originalRows];
  rows = ensureHeader(rows, "Apollo Email");
  rows = ensureHeader(rows, "Apollo LinkedIn");

  matchesList.forEach((match, idx) => {
    const dataRowIndex = startDataRowIndex + idx;
    if (dataRowIndex < rows.length) {
      const email = match && match.email ? match.email : "";
      const userLinkedin =
        match && match.linkedin_url ? match.linkedin_url : "";
      rows[dataRowIndex] = setEmailInRow(
        rows[0],
        rows[dataRowIndex],
        email,
        "Apollo Email"
      );
      rows[dataRowIndex] = setEmailInRow(
        rows[0],
        rows[dataRowIndex],
        userLinkedin,
        "Apollo LinkedIn"
      );
    }
  });

  return rows;
}

/**
 * Extract emails from Apollo matches.
 * @param {Object[]} matchesList - Array of Apollo match objects
 * @returns {string[]} Array of email strings
 */
export function extractEmailsFromMatches(matchesList) {
  return matchesList.filter((m) => m && m.email).map((m) => m.email);
}

/**
 * Process a single chunk of Apollo API requests.
 * @param {Object[]} chunkDetails - Details for this chunk
 * @param {number} chunkIndex - Current chunk index
 * @param {number} totalChunks - Total number of chunks
 * @returns {Promise<Object[]>} Array of match results
 */
async function processApolloChunk(chunkDetails, chunkIndex, totalChunks) {
  replaceText(
    "apollo-data",
    `Processing Apollo chunk ${chunkIndex + 1}/${totalChunks}...`
  );

  const req = await buildApolloRequest(chunkDetails);
  const response = await fetch(req.url, {
    method: "POST",
    headers: req.headers,
    body: req.body,
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  console.log(`Apollo chunk ${chunkIndex + 1} response:`, data);
  return Array.isArray(data) ? data : data.matches || [];
}

/**
 * Update enriched CSV data with Apollo chunk results.
 * @param {Object[]} matchesList - Match results from Apollo
 * @param {number} startIndex - Starting data row index
 */
function updateCsvWithApolloChunk(matchesList, startIndex) {
  const startDataRowIndex = 1 + startIndex;
  const currentData = getEnrichedCsvData();
  const updatedData = applyApolloMatchesToCsvChunk(
    currentData,
    matchesList,
    startDataRowIndex
  );
  setEnrichedCsvData(updatedData);
  displayCsvAsTable(updatedData, normalizeCsvRows);
}

/**
 * Main Apollo fetch function - processes all data in chunks.
 */
export async function fetchApollo() {
  const apolloEl = getElementSafely("apollo-data");
  if (!apolloEl) return;

  apolloEl.innerText = "Loading...";

  const csvRows = getCsvRows();
  const detailsAll = getApolloDetailsFromCsvRows(csvRows);
  if (!detailsAll.length) {
    apolloEl.innerText = "No details to query";
    return;
  }

  let enrichedCsvData = getEnrichedCsvData();
  if (!enrichedCsvData || !enrichedCsvData.length) {
    enrichedCsvData = [...csvRows];
    setEnrichedCsvData(enrichedCsvData);
  }

  const CHUNK_SIZE = 10;
  const totalChunks = Math.ceil(detailsAll.length / CHUNK_SIZE);
  const allMatches = [];

  try {
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const chunkDetails = detailsAll.slice(start, start + CHUNK_SIZE);

      const matchesList = await processApolloChunk(
        chunkDetails,
        chunkIndex,
        totalChunks
      );
      allMatches.push(...matchesList);

      updateCsvWithApolloChunk(matchesList, start);
    }

    const emails = extractEmailsFromMatches(allMatches);
    const emailText = emails.length > 0 ? emails.join(", ") : "No emails found";
    replaceText("apollo-data", emailText);
    console.log("Apollo completed. Emails:", emailText);
  } catch (error) {
    console.error("Apollo request error:", error);
    apolloEl.innerText = `Error: ${error.message}`;
  }
}
