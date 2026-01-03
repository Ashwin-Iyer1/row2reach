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
    
    const pTargetColIdx = primaryHeaders.length; // Start adding new columns here

    const sFirstNameIdx = secondaryHeaders.indexOf('first name');
    const sLastNameIdx = secondaryHeaders.indexOf('last name');
    const sFullNameIdx = secondaryHeaders.indexOf('full name');
    
    // Find ALL email columns in secondary CSV
    const sEmailIndices = secondaryHeaders
        .map((h, i) => h.includes('email') ? i : -1)
        .filter(i => i !== -1);

    if (sEmailIndices.length === 0) {
        alert("Secondary CSV must have at least one 'Email' column.");
        return;
    }

    // specific lookup map: Key -> Array of unique emails
    const emailLookup = new Map();
    let maxEmailsFound = 0;

    for (let i = 1; i < secondaryRows.length; i++) {
        const row = parseRowColumns(secondaryRows[i]);
        if (!row) continue;
        
        // Collect emails from all email columns
        const emailSet = new Set();
        sEmailIndices.forEach(idx => {
            const val = row[idx]?.trim();
            if (val) {
                // Split by comma or semicolon
                val.split(/[;,]/).forEach(e => {
                    const clean = e.trim();
                    if (clean) emailSet.add(clean);
                });
            }
        });
        
        const emails = Array.from(emailSet);
        if (emails.length === 0) continue;

        if (emails.length > maxEmailsFound) {
            maxEmailsFound = emails.length;
        }

        if (sFirstNameIdx !== -1 && sLastNameIdx !== -1) {
            const first = row[sFirstNameIdx]?.trim().toLowerCase() || "";
            const last = row[sLastNameIdx]?.trim().toLowerCase() || "";
            if (first && last) {
                emailLookup.set(`${first}|${last}`, emails);
            }
        }
        
        if (sFullNameIdx !== -1) {
            const full = row[sFullNameIdx]?.trim().toLowerCase() || "";
            if (full) {
                emailLookup.set(full, emails);
            }
        }
    }

    if (maxEmailsFound === 0) {
        alert("No emails found to merge.");
        return;
    }

    // Create new column headers based on filename and count
    const cleanFileName = filename ? filename.replace(/\.csv$/i, '') : 'Imported';
    let newHeaders = "";
    for (let k = 1; k <= maxEmailsFound; k++) {
        newHeaders += `,${cleanFileName} Email ${k}`;
    }
    
    // Append new headers
    currentRows[0] += newHeaders;

    let matchCount = 0;
    for (let i = 1; i < currentRows.length; i++) {
        let rowCols = parseRowColumns(currentRows[i]);
        
        let matchEmails = null;

        if (pFirstNameIdx !== -1 && pLastNameIdx !== -1) {
            const first = rowCols[pFirstNameIdx]?.trim().toLowerCase() || "";
            const last = rowCols[pLastNameIdx]?.trim().toLowerCase() || "";
            if (first && last) {
                matchEmails = emailLookup.get(`${first}|${last}`);
            }
        }

        if (!matchEmails && pFullNameIdx !== -1) {
            const full = rowCols[pFullNameIdx]?.trim().toLowerCase() || "";
            if (full) {
                matchEmails = emailLookup.get(full);
            }
        }

        // Add matching emails to the new columns
        // Ensure padding up to the start of new columns
        while (rowCols.length < pTargetColIdx) {
            rowCols.push("");
        }
        
        if (matchEmails && matchEmails.length > 0) {
            matchEmails.forEach(email => rowCols.push(email));
            // Pad remaining columns if this person has fewer than max
            for (let k = matchEmails.length; k < maxEmailsFound; k++) {
                rowCols.push("");
            }
            matchCount++;
        } else {
             // Just padding if no match
             for (let k = 0; k < maxEmailsFound; k++) {
                rowCols.push("");
            }
        }
        currentRows[i] = rowCols.join(',');
    }

    alert(`Merged emails for ${matchCount} matches. Added ${maxEmailsFound} new column(s).`);
    
    // Update state and refresh
    setEnrichedCsvData(currentRows);
    displayCsvAsTable(currentRows, normalizeCsvRows);
}
