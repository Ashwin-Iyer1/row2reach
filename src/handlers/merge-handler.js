/**
 * Merge Handler Module
 * Handles logic for merging a secondary CSV into the main data
 */

import { parseRowColumns } from "../utils/csv-utils.js";
import { getCsvRows, setEnrichedCsvData } from "../state/app-state.js";
import { displayCsvAsTable } from "../utils/table-builder.js";
import { normalizeCsvRows } from "../utils/csv-utils.js";

export function initializeMergeHandler() {
  const mergeBtn = document.getElementById("merge-csv-button");
  const mergeInput = document.getElementById("merge-csv-input");

  if (!mergeBtn || !mergeInput) return;

  mergeBtn.addEventListener("click", () => {
    mergeInput.click();
  });

  mergeInput.addEventListener("change", function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
      const secondaryCsvContent = e.target.result;
      mergeEmailsFromCsv(secondaryCsvContent, file.name);
      // Reset input
      event.target.value = '';
    };
    reader.readAsText(file);
  });
}

function mergeEmailsFromCsv(secondaryCsv, filename) {
    let currentRows = getCsvRows();
    
    if (!currentRows || currentRows.length === 0) {
        alert("No main CSV loaded.");
        return;
    }

    const secondaryRows = secondaryCsv.split(/\r?\n/).filter(r => r.trim() !== "");
    if (secondaryRows.length < 2) return;

    const primaryHeaders = parseRowColumns(currentRows[0]).map(h => h.trim().toLowerCase());
    const secondaryHeaders = parseRowColumns(secondaryRows[0]).map(h => h.trim().toLowerCase());

    const pFirstNameIdx = primaryHeaders.indexOf('first name');
    const pLastNameIdx = primaryHeaders.indexOf('last name');
    const pFullNameIdx = primaryHeaders.indexOf('full name');
    
    // Create new column header based on filename
    const cleanFileName = filename ? filename.replace(/\.csv$/i, '') : 'Imported';
    const newHeaderName = `${cleanFileName} Email`;
    
    // Append new header
    currentRows[0] += `,${newHeaderName}`;
    const pTargetColIdx = primaryHeaders.length; // New index is at the end (current length)

    const sFirstNameIdx = secondaryHeaders.indexOf('first name');
    const sLastNameIdx = secondaryHeaders.indexOf('last name');
    const sFullNameIdx = secondaryHeaders.indexOf('full name');
    const sEmailIdx = secondaryHeaders.findIndex(h => h.includes('email'));

    if (sEmailIdx === -1) {
        alert("Secondary CSV must have an 'Email' column.");
        return;
    }

    const emailLookup = new Map();

    for (let i = 1; i < secondaryRows.length; i++) {
        const row = parseRowColumns(secondaryRows[i]);
        if (!row) continue;
        const email = row[sEmailIdx]?.trim();
        if (!email) continue;

        if (sFirstNameIdx !== -1 && sLastNameIdx !== -1) {
            const first = row[sFirstNameIdx]?.trim().toLowerCase() || "";
            const last = row[sLastNameIdx]?.trim().toLowerCase() || "";
            if (first && last) {
                emailLookup.set(`${first}|${last}`, email);
            }
        }
        
        if (sFullNameIdx !== -1) {
            const full = row[sFullNameIdx]?.trim().toLowerCase() || "";
            if (full) {
                emailLookup.set(full, email);
            }
        }
    }

    let matchCount = 0;
    for (let i = 1; i < currentRows.length; i++) {
        let rowCols = parseRowColumns(currentRows[i]);
        
        let matchEmail = null;

        if (pFirstNameIdx !== -1 && pLastNameIdx !== -1) {
            const first = rowCols[pFirstNameIdx]?.trim().toLowerCase() || "";
            const last = rowCols[pLastNameIdx]?.trim().toLowerCase() || "";
            if (first && last) {
                matchEmail = emailLookup.get(`${first}|${last}`);
            }
        }

        if (!matchEmail && pFullNameIdx !== -1) {
            const full = rowCols[pFullNameIdx]?.trim().toLowerCase() || "";
            if (full) {
                matchEmail = emailLookup.get(full);
            }
        }

        // Add matching email to the new column
        if (matchEmail) {
            // Ensure padding up to the new column
            while (rowCols.length < pTargetColIdx) {
                rowCols.push("");
            }
            rowCols[pTargetColIdx] = matchEmail;
            matchCount++;
        } else {
             // Just padding if no match
             while (rowCols.length <= pTargetColIdx) {
                rowCols.push("");
            }
        }
        currentRows[i] = rowCols.join(',');
    }

    alert(`Merged ${matchCount} emails.`);
    
    // Update state and refresh
    // We updated 'currentRows' in place (array of strings).
    // Update enriched data too if separate? App state usually has setEnrichedCsvData.
    setEnrichedCsvData(currentRows);
    
    // Redisplay
    displayCsvAsTable(currentRows, normalizeCsvRows);
}
