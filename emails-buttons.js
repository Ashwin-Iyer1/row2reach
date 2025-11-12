let variables = [];
// Store preview data for each row (for CSV export)
let previewData = {};

/**
 * Generate Northeastern.edu email variations based on first and last name
 * @param {string} firstName - The first name
 * @param {string} lastName - The last name
 * @returns {string[]} - Array of email variations
 */
function generateNortheasternEmails(firstName, lastName) {
  if (!firstName || !lastName) return [];
  
  const first = firstName.toLowerCase().trim();
  const last = lastName.toLowerCase().trim();
  
  const emails = [];
  
  // [first_initial].[last] + @northeastern.edu
  emails.push(`${first.charAt(0)}.${last}@northeastern.edu`);
  
  // [last].[first_initial] + @northeastern.edu
  emails.push(`${last}.${first.charAt(0)}@northeastern.edu`);
  
  // [last].[first_2_initials] + @northeastern.edu
  if (first.length >= 2) {
    emails.push(`${last}.${first.substring(0, 2)}@northeastern.edu`);
  }
  
  // [last].[first_3_initials] + @northeastern.edu
  if (first.length >= 3) {
    emails.push(`${last}.${first.substring(0, 3)}@northeastern.edu`);
  }
  
  // [last].[first_N_initials] + @northeastern.edu (up to full first name)
  for (let i = 4; i <= first.length; i++) {
    emails.push(`${last}.${first.substring(0, i)}@northeastern.edu`);
  }
  
  return emails;
}

/**
 * Check if an email domain is northeastern.edu
 * @param {string} email - The email address to check
 * @returns {boolean} - True if domain is northeastern.edu
 */
function isNortheasternEmail(email) {
  if (!email) return false;
  const domain = email.split('@')[1];
  return domain && domain.toLowerCase() === 'northeastern.edu';
}

function normalizeCsvRows(csv) {
  let rows;

  if (Array.isArray(csv)) {
    rows = csv.filter((row) => row.trim() !== "");
  } else {
    rows = csv.split(/\r?\n/).filter((row) => row.trim() !== "");
  }

  // 🛠 Fix for "bad" one-liner input
  if (rows.length === 1 && rows[0].includes("ContactOut Email,")) {
    const parts = rows[0].split(",");
    const header = parts.slice(0, 4).join(",");
    const data = parts.slice(4);

    const fixedRows = [header];
    for (let i = 0; i < data.length; i += 4) {
      const chunk = data.slice(i, i + 4);
      if (chunk.length) {
        fixedRows.push(chunk.join(","));
      }
    }
    rows = fixedRows;
  }

  return rows;
}

/**
 * Build a <table> element from CSV rows (first row is header).
 */
function buildTableFromRows(rows) {
  const table = document.createElement("table");
  table.border = "1"; // Basic styling

  // Header
  const headers = rows[0].split(",");
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headers.forEach((headerText) => {
    const th = document.createElement("th");
    th.textContent = headerText.trim();
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement("tbody");
  for (let i = 1; i < rows.length; i++) {
    const rowData = rows[i].split(",");
    const tr = document.createElement("tr");
    rowData.forEach((cellData) => {
      const td = document.createElement("td");
      td.textContent = cellData.trim();
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  return table;
}

/**
 * Render a table into the container element.
 */
function renderTable(table) {
  const container = document.getElementById("table-container");
  container.innerHTML = ""; // Clear previous content
  container.appendChild(table);
}

/**
 * Dispatch a custom event that CSV rows have been updated.
 */
function dispatchCsvRowsUpdated(rows) {
  window.dispatchEvent(new CustomEvent("csv:rows-updated", { detail: rows }));
}

/**
 * Public function to display CSV as a table.
 * Accepts CSV string or array, normalizes, dispatches event, and renders table.
 */
function displayCsvAsTable(csv) {
  const rows = normalizeCsvRows(csv);
  if (rows.length === 0) return;

  dispatchCsvRowsUpdated(rows);
  const table = buildTableFromRows(rows);
  renderTable(table);
}

function getCSVHeaderNames(csv) {
  const rows = normalizeCsvRows(csv);
  if (rows.length === 0) return [];

  const headers = rows[0].split(",").map((h) => h.trim());
  return headers;
}

document
  .getElementById("back-arrow-button")
  .addEventListener("click", function () {
    window.electronAPI.navigateTo("index.html");
  });

const signInButton = document.getElementById("signIn");
// UI event handlers
signInButton.addEventListener("click", () => {
  window.electronAPI.sendLoginMessage();
});

window.electronAPI.onHideButton((event, message) => {
  if (message === "hide") {
    console.log('Received "hide" message. Hiding button.');
    signInButton.style.display = "none"; // Hide the button
    const sendEmailButtons = document.querySelectorAll(".send-email-button");
    if (sendEmailButtons.length !== 0) {
      sendEmailButtons.forEach((btn) => {
        btn.style.display = "block";
      });
    }
    // Also show the draft all button
    const draftAllButton = document.getElementById("draftAll");
    if (draftAllButton) {
      draftAllButton.style.display = "block";
    }
    // Also show the send all button
    const sendAllButton = document.getElementById("sendAll");
    if (sendAllButton) {
      sendAllButton.style.display = "block";
    }
  }
});

// Draft All button handler
document.getElementById("draftAll").addEventListener("click", function () {
  const textInput = document.getElementById("body").value;
  const subjectInput = document.getElementById("subject").value;

  if (!textInput || !subjectInput) {
    alert("Please enter both subject and message before creating drafts.");
    return;
  }

  if (!enrichedCsvData || enrichedCsvData.length <= 1) {
    alert("No CSV data available. Please load data first.");
    return;
  }

  const headers = enrichedCsvData[0].split(",").map((h) => h.trim());
  let draftCount = 0;

  // Process each data row (skip header at index 0)
  for (let i = 1; i < enrichedCsvData.length; i++) {
    const dataRow = enrichedCsvData[i].split(",").map((d) => d.trim());

    let formattedText = textInput;
    let formattedSubject = subjectInput;

    // Replace each variable with corresponding data for this row
    headers.forEach((header, index) => {
      const variable = `{${header}}`;
      const value = dataRow[index] || "";
      formattedText = formattedText.replace(
        new RegExp(escapeRegExp(variable), "g"),
        value
      );
      formattedSubject = formattedSubject.replace(
        new RegExp(escapeRegExp(variable), "g"),
        value
      );
    });

    // Find email header indexes
    const emailHeaderIndexes = headers
      .map((h, idx) => (h.toLowerCase().includes("email") ? idx : -1))
      .filter((idx) => idx !== -1);

    // Check if this is a Northeastern domain row
    const domainIdx = headers.findIndex(h => h.toLowerCase() === 'domain');
    const isNortheasternDomain = domainIdx !== -1 && 
      (dataRow[domainIdx] || "").trim().toLowerCase() === 'northeastern.edu';
    
    let recipient = "";
    
    // If Northeastern domain, use [last].[first_initial]@northeastern.edu as primary recipient
    if (isNortheasternDomain) {
      const firstNameIdx = headers.findIndex(h => h.toLowerCase().includes('first') && h.toLowerCase().includes('name'));
      const lastNameIdx = headers.findIndex(h => h.toLowerCase().includes('last') && h.toLowerCase().includes('name'));
      
      if (firstNameIdx !== -1 && lastNameIdx !== -1) {
        const firstName = (dataRow[firstNameIdx] || "").trim();
        const lastName = (dataRow[lastNameIdx] || "").trim();
        
        if (firstName && lastName) {
          const first = firstName.toLowerCase();
          const last = lastName.toLowerCase();
          recipient = `${last}.${first.charAt(0)}@northeastern.edu`;
        }
      }
    }

    // Collect all available email addresses for this row (normalize to lowercase)
    const availableEmails = [];
    
    // For Northeastern domains, add the primary email first
    if (isNortheasternDomain && recipient) {
      availableEmails.push(recipient);
    }
    
    // Add all other emails from CSV columns
    emailHeaderIndexes.forEach((idx) => {
      const email = (dataRow[idx] || "").trim().toLowerCase();
      if (email && !availableEmails.includes(email)) {
        availableEmails.push(email);
      }
    });

    // Add northeastern BCCs if they exist for this row
    if (northeasternBccsByRow[i]) {
      northeasternBccsByRow[i].forEach(email => {
        const lowerEmail = email.toLowerCase();
        if (!availableEmails.includes(lowerEmail)) {
          availableEmails.push(lowerEmail);
        }
      });
    }

    // Remove duplicates and pick the first email as recipient (if not already set for Northeastern)
    const uniqueEmails = [...new Set(availableEmails)];
    if (!recipient) {
      recipient = uniqueEmails[0] || "";
    }
    
    if (recipient) {
      // Send the email data to main process
      window.electronAPI.sendMessage("send-email", {
        recipient: recipient,
        bcc: uniqueEmails.filter((email) => email !== recipient),
        subject: formattedSubject,
        body: formattedText,
        importance: "Normal",
      });
      draftCount++;
    }
  }

  alert(`Successfully created ${draftCount} email drafts!`);
});

// Store generated Northeastern BCCs per row (in memory only, not in CSV)
let northeasternBccsByRow = {};

// Add Northeastern BCCs to All button handler
document.getElementById("addNortheasternAll").addEventListener("click", function () {
  if (!enrichedCsvData || enrichedCsvData.length <= 1) {
    alert("No CSV data available. Please load data first.");
    return;
  }

  const headers = enrichedCsvData[0].split(",").map((h) => h.trim());
  
  // Find the Domain, First Name, and Last Name column indexes
  const domainIdx = headers.findIndex(h => h.toLowerCase() === 'domain');
  const firstNameIdx = headers.findIndex(h => h.toLowerCase().includes('first') && h.toLowerCase().includes('name'));
  const lastNameIdx = headers.findIndex(h => h.toLowerCase().includes('last') && h.toLowerCase().includes('name'));
  
  if (domainIdx === -1) {
    alert("No 'Domain' column found in CSV data.");
    return;
  }
  
  if (firstNameIdx === -1 || lastNameIdx === -1) {
    alert("First Name and/or Last Name columns not found in CSV data.");
    return;
  }

  let processedRows = 0;
  let totalEmailsGenerated = 0;

  // Process each data row (skip header at index 0)
  for (let i = 1; i < enrichedCsvData.length; i++) {
    const dataRow = enrichedCsvData[i].split(",").map((d) => d.trim());
    
    const domain = (dataRow[domainIdx] || "").trim().toLowerCase();
    
    if (domain === 'northeastern.edu') {
      const firstName = (dataRow[firstNameIdx] || "").trim();
      const lastName = (dataRow[lastNameIdx] || "").trim();
      
      if (firstName && lastName) {
        const northeasternEmails = generateNortheasternEmails(firstName, lastName);
        
        // Store the generated emails for this row
        northeasternBccsByRow[i] = northeasternEmails;
        
        processedRows++;
        totalEmailsGenerated += northeasternEmails.length;
      }
    }
  }
  
  alert(`Generated ${totalEmailsGenerated} Northeastern email variations for ${processedRows} rows! These will be included as BCCs when you send/draft emails.`);
  
  // Trigger a preview refresh if preview is already showing
  if (document.getElementById("preview-list").children.length > 0) {
    document.getElementById("preview-button").click();
  }
});

// Send All button handler
document.getElementById("sendAll").addEventListener("click", function () {
  const textInput = document.getElementById("body").value;
  const subjectInput = document.getElementById("subject").value;

  if (!textInput || !subjectInput) {
    alert("Please enter both subject and message before sending emails.");
    return;
  }

  if (!enrichedCsvData || enrichedCsvData.length <= 1) {
    alert("No CSV data available. Please load data first.");
    return;
  }

  const headers = enrichedCsvData[0].split(",").map((h) => h.trim());
  let sendCount = 0;

  // Process each data row (skip header at index 0)
  for (let i = 1; i < enrichedCsvData.length; i++) {
    const dataRow = enrichedCsvData[i].split(",").map((d) => d.trim());

    let formattedText = textInput;
    let formattedSubject = subjectInput;

    // Replace each variable with corresponding data for this row
    headers.forEach((header, index) => {
      const variable = `{${header}}`;
      const value = dataRow[index] || "";
      formattedText = formattedText.replace(
        new RegExp(escapeRegExp(variable), "g"),
        value
      );
      formattedSubject = formattedSubject.replace(
        new RegExp(escapeRegExp(variable), "g"),
        value
      );
    });

    // Find email header indexes
    const emailHeaderIndexes = headers
      .map((h, idx) => (h.toLowerCase().includes("email") ? idx : -1))
      .filter((idx) => idx !== -1);

    // Check if this is a Northeastern domain row
    const domainIdx = headers.findIndex(h => h.toLowerCase() === 'domain');
    const isNortheasternDomain = domainIdx !== -1 && 
      (dataRow[domainIdx] || "").trim().toLowerCase() === 'northeastern.edu';
    
    let recipient = "";
    
    // If Northeastern domain, use [last].[first_initial]@northeastern.edu as primary recipient
    if (isNortheasternDomain) {
      const firstNameIdx = headers.findIndex(h => h.toLowerCase().includes('first') && h.toLowerCase().includes('name'));
      const lastNameIdx = headers.findIndex(h => h.toLowerCase().includes('last') && h.toLowerCase().includes('name'));
      
      if (firstNameIdx !== -1 && lastNameIdx !== -1) {
        const firstName = (dataRow[firstNameIdx] || "").trim();
        const lastName = (dataRow[lastNameIdx] || "").trim();
        
        if (firstName && lastName) {
          const first = firstName.toLowerCase();
          const last = lastName.toLowerCase();
          recipient = `${last}.${first.charAt(0)}@northeastern.edu`;
        }
      }
    }

    // Collect all available email addresses for this row (normalize to lowercase)
    const availableEmails = [];
    
    // For Northeastern domains, add the primary email first
    if (isNortheasternDomain && recipient) {
      availableEmails.push(recipient);
    }
    
    // Add all other emails from CSV columns
    emailHeaderIndexes.forEach((idx) => {
      const email = (dataRow[idx] || "").trim().toLowerCase();
      if (email && !availableEmails.includes(email)) {
        availableEmails.push(email);
      }
    });

    // Add northeastern BCCs if they exist for this row
    if (northeasternBccsByRow[i]) {
      northeasternBccsByRow[i].forEach(email => {
        const lowerEmail = email.toLowerCase();
        if (!availableEmails.includes(lowerEmail)) {
          availableEmails.push(lowerEmail);
        }
      });
    }

    // Remove duplicates and pick the first email as recipient (if not already set for Northeastern)
    const uniqueEmails = [...new Set(availableEmails)];
    if (!recipient) {
      recipient = uniqueEmails[0] || "";
    }
    
    if (recipient) {
      // Send the email immediately to main process
      window.electronAPI.sendMessage("send-mail-now", {
        recipient: recipient,
        bcc: uniqueEmails.filter((email) => email !== recipient),
        subject: formattedSubject,
        body: formattedText,
        importance: "Normal",
      });
      sendCount++;
    }
  }

  alert(`Successfully sent ${sendCount} emails!`);
});

document
  .getElementById("preview-button")
  .addEventListener("click", function () {
    const textInput = document.getElementById("body").value;
    const subjectInput = document.getElementById("subject").value;
    const preview_list = document.getElementById("preview-list");

    // Clear previous previews and preview data
    preview_list.innerHTML = "";
    previewData = {};

    // Get all data rows (skip header at index 0)
    if (enrichedCsvData && enrichedCsvData.length > 1) {
      const headers = enrichedCsvData[0].split(",").map((h) => h.trim());

      // Process each data row
      for (let i = 1; i < enrichedCsvData.length; i++) {
        const dataRow = enrichedCsvData[i].split(",").map((d) => d.trim());

        let formattedText = textInput;
        let formattedSubject = subjectInput;

        // Replace each variable with corresponding data for this row
        headers.forEach((header, index) => {
          const variable = `{${header}}`;
          const value = dataRow[index] || "";
          formattedText = formattedText.replace(
            new RegExp(escapeRegExp(variable), "g"),
            value
          );
          formattedSubject = formattedSubject.replace(
            new RegExp(escapeRegExp(variable), "g"),
            value
          );
        });

        // Add a label to identify which row this preview is for
        const parentDiv = document.createElement("div");
        parentDiv.style.marginBottom = "15px";
        parentDiv.style.border = "1px solid #ccc";
        parentDiv.style.padding = "10px";
        parentDiv.style.borderRadius = "5px";

        const label = document.createElement("div");
        label.style.fontWeight = "bold";
        label.style.marginBottom = "5px";
        label.style.display = "flex";
        label.style.justifyContent = "space-between";

        const previewText = document.createElement("p");
        previewText.textContent = `Preview for Row ${i}:`;

        // Create button container for both buttons
        const buttonContainer = document.createElement("div");
        buttonContainer.style.display = "flex";
        buttonContainer.style.gap = "10px";

        const sendEmailButton = document.createElement("button");
        sendEmailButton.id = "sendEmailButton";
        sendEmailButton.textContent = "Create Email Draft";
        sendEmailButton.className = "send-email-button";
        sendEmailButton.style.display =
          signInButton.style.display == "none" ? "block" : "none";

        sendEmailButton.onclick = () => {
          // Example: assume one column is called "Email" in your CSV
          const emailHeaderIndexes = headers
            .map((h, i) => (h.toLowerCase().includes("email") ? i : -1))
            .filter((i) => i !== -1);

          // Loop through those columns and pick the first filled one
          let recipient = "";
          for (const i of emailHeaderIndexes) {
            const value = (dataRow[i] || "").trim();
            if (value) {
              recipient = value;
              break;
            }
          }

          // Send the email data to main process
          const uniqueEmails = [...new Set(availableEmails)];
          window.electronAPI.sendMessage("send-email", {
            recipient: recipient,
            bcc: uniqueEmails.filter((email) => email !== recipient),
            subject: formattedSubject,
            body: formattedText,
            importance: "Normal",
          });

          // Optional UI feedback
          sendEmailButton.textContent = "Draft Created!";
          sendEmailButton.disabled = true;
        };

        // Create Send Email Now button
        const sendEmailNowButton = document.createElement("button");
        sendEmailNowButton.id = "sendEmailNowButton";
        sendEmailNowButton.textContent = "Send Email";
        sendEmailNowButton.className = "send-email-now-button";
        sendEmailNowButton.style.display =
          signInButton.style.display == "none" ? "block" : "none";

        sendEmailNowButton.onclick = () => {
          // Example: assume one column is called "Email" in your CSV
          const emailHeaderIndexes = headers
            .map((h, i) => (h.toLowerCase().includes("email") ? i : -1))
            .filter((i) => i !== -1);

          // Loop through those columns and pick the first filled one
          let recipient = "";
          for (const i of emailHeaderIndexes) {
            const value = (dataRow[i] || "").trim();
            if (value) {
              recipient = value;
              break;
            }
          }

          // Send the email data to main process
          const uniqueEmails = [...new Set(availableEmails)];
          window.electronAPI.sendMessage("send-mail-now", {
            recipient: recipient,
            bcc: uniqueEmails.filter((email) => email !== recipient),
            subject: formattedSubject,
            body: formattedText,
            importance: "Normal",
          });

          // Optional UI feedback
          sendEmailNowButton.textContent = "Email Sent!";
          sendEmailNowButton.disabled = true;
        };

        buttonContainer.appendChild(sendEmailButton);
        buttonContainer.appendChild(sendEmailNowButton);

        label.appendChild(previewText);
        label.appendChild(buttonContainer);

        // Create a p element for the subject preview
        const subjectPreview = document.createElement("p");
        subjectPreview.style.fontWeight = "bold";
        subjectPreview.style.marginBottom = "5px";
        subjectPreview.style.padding = "5px";
        subjectPreview.textContent = `${formattedSubject}`;

        // Create a textarea for this row's body preview
        const textarea = document.createElement("textarea");
        textarea.id = `preview-textarea`;
        textarea.value = formattedText;
        const emailHeaderIndexes = headers
          .map((h, i) => (h.toLowerCase().includes("email") ? i : -1))
          .filter((i) => i !== -1);

        // Check if this is a Northeastern domain row
        const domainIdx = headers.findIndex(h => h.toLowerCase() === 'domain');
        const isNortheasternDomain = domainIdx !== -1 && 
          (dataRow[domainIdx] || "").trim().toLowerCase() === 'northeastern.edu';
        
        let recipient = "";
        
        // If Northeastern domain, use [last].[first_initial]@northeastern.edu as primary recipient
        if (isNortheasternDomain) {
          const firstNameIdx = headers.findIndex(h => h.toLowerCase().includes('first') && h.toLowerCase().includes('name'));
          const lastNameIdx = headers.findIndex(h => h.toLowerCase().includes('last') && h.toLowerCase().includes('name'));
          
          if (firstNameIdx !== -1 && lastNameIdx !== -1) {
            const firstName = (dataRow[firstNameIdx] || "").trim();
            const lastName = (dataRow[lastNameIdx] || "").trim();
            
            if (firstName && lastName) {
              const first = firstName.toLowerCase();
              const last = lastName.toLowerCase();
              recipient = `${last}.${first.charAt(0)}@northeastern.edu`;
            }
          }
        }
        
        // If no Northeastern recipient was set, fall back to first available email
        if (!recipient) {
          for (const i of emailHeaderIndexes) {
            const value = (dataRow[i] || "").trim();
            if (value) {
              recipient = value;
              break;
            }
          }
        }

        const recipientEmail = (recipient || "").toLowerCase();

        // Create a container for recipient with change button
        const recipientContainer = document.createElement("div");
        recipientContainer.style.display = "flex";
        recipientContainer.style.alignItems = "left";
        recipientContainer.style.marginBottom = "5px";
        recipientContainer.style.gap = "10px";
        recipientContainer.style.display = "flex";
        recipientContainer.style.flexDirection = "column";

        const recipientSelectContainer = document.createElement("div");
        recipientSelectContainer.style.display = "flex";
        recipientSelectContainer.style.gap = "10px";

        const recipientEmailText = document.createElement("p");
        recipientEmailText.textContent = `Recipient: ${recipientEmail}`;
        recipientEmailText.style.fontWeight = "bold";
        recipientEmailText.style.margin = "0";

        // Collect all available email addresses for this row (normalize to lowercase)
        const availableEmails = [];
        
        // For Northeastern domains, add the primary [last].[first_initial] email first
        if (isNortheasternDomain && recipientEmail) {
          availableEmails.push(recipientEmail);
        }
        
        // Add all other emails from CSV columns
        emailHeaderIndexes.forEach((idx) => {
          const email = (dataRow[idx] || "").trim().toLowerCase();
          if (email && !availableEmails.includes(email)) {
            availableEmails.push(email);
          }
        });

        // Add northeastern BCCs if they were already generated
        if (northeasternBccsByRow[i]) {
          northeasternBccsByRow[i].forEach(email => {
            const lowerEmail = email.toLowerCase();
            if (!availableEmails.includes(lowerEmail)) {
              availableEmails.push(lowerEmail);
            }
          });
        }

        // Remove duplicates from availableEmails
        const uniqueEmails = [...new Set(availableEmails)];

        // Store preview data for this row (for CSV export)
        previewData[i] = {
          to: recipientEmail,
          bcc: uniqueEmails.filter((email) => email && email !== recipientEmail),
          subject: formattedSubject,
          body: formattedText
        };

        const bccEmailText = document.createElement("p");
        bccEmailText.textContent = `BCC Addresses: ${uniqueEmails
          .filter((email) => email && email !== recipientEmail)
          .join(", ")}`;
        bccEmailText.style.fontSize = "12px";
        bccEmailText.style.color = "#cfcfcfff";

        // Declare selectDropdown in outer scope so it can be accessed by northeastern button
        let selectDropdown = null;

        // Create Add Northeastern BCCs button (only show if domain is northeastern.edu)
        const addNortheasternButton = document.createElement("button");
        addNortheasternButton.textContent = "Add Northeastern BCCs";
        addNortheasternButton.className = "add-northeastern-bcc-button";
        
        // Use the already declared isNortheasternDomain variable
        const hasNortheasternDomain = isNortheasternDomain;
        
        if (hasNortheasternDomain) {
          // Try to find First Name and Last Name in headers
          const firstNameIdx = headers.findIndex(h => h.toLowerCase().includes('first') && h.toLowerCase().includes('name'));
          const lastNameIdx = headers.findIndex(h => h.toLowerCase().includes('last') && h.toLowerCase().includes('name'));
          
          if (firstNameIdx !== -1 && lastNameIdx !== -1) {
            const firstName = (dataRow[firstNameIdx] || "").trim();
            const lastName = (dataRow[lastNameIdx] || "").trim();
            
            addNortheasternButton.onclick = () => {
              const northeasternEmails = generateNortheasternEmails(firstName, lastName);
              
              // Store in global object so Draft All/Send All can use them
              northeasternBccsByRow[i] = northeasternEmails;
              
              // Add the generated emails to availableEmails array (normalize to lowercase)
              northeasternEmails.forEach(email => {
                const lowerEmail = email.toLowerCase();
                if (!availableEmails.includes(lowerEmail)) {
                  availableEmails.push(lowerEmail);
                }
              });
              
              // Update BCC display
              const currentRecipient = (selectDropdown ? selectDropdown.value : recipient).toLowerCase();
              const uniqueEmails = [...new Set(availableEmails)];
              bccEmailText.textContent = `BCC Addresses: ${uniqueEmails
                .filter((email) => email !== currentRecipient)
                .join(", ")}`;
              
              // Update preview data with new BCC list
              previewData[i] = {
                to: currentRecipient,
                bcc: uniqueEmails.filter((email) => email !== currentRecipient),
                subject: formattedSubject,
                body: formattedText
              };
              
              // Update button to show it was clicked
              addNortheasternButton.textContent = "BCCs Added!";
              addNortheasternButton.disabled = true;
              
              // Re-enable the send buttons and reset their text
              sendEmailButton.textContent = "Create Email Draft";
              sendEmailButton.disabled = false;
              sendEmailNowButton.textContent = "Send Email";
              sendEmailNowButton.disabled = false;
              
              // Update the sendEmailButton's onclick to use the updated BCC list
              sendEmailButton.onclick = () => {
                const finalRecipient = selectDropdown ? selectDropdown.value : recipient;
                const uniqueEmails = [...new Set(availableEmails)];
                window.electronAPI.sendMessage("send-email", {
                  recipient: finalRecipient,
                  bcc: uniqueEmails.filter((email) => email !== finalRecipient),
                  subject: formattedSubject,
                  body: formattedText,
                  importance: "Normal",
                });

                sendEmailButton.textContent = "Draft Created!";
                sendEmailButton.disabled = true;
              };
              
              // Update the sendEmailNowButton's onclick to use the updated BCC list
              sendEmailNowButton.onclick = () => {
                const finalRecipient = selectDropdown ? selectDropdown.value : recipient;
                const uniqueEmails = [...new Set(availableEmails)];
                window.electronAPI.sendMessage("send-mail-now", {
                  recipient: finalRecipient,
                  bcc: uniqueEmails.filter((email) => email !== finalRecipient),
                  subject: formattedSubject,
                  body: formattedText,
                  importance: "Normal",
                });

                sendEmailNowButton.textContent = "Email Sent!";
                sendEmailNowButton.disabled = true;
              };
            };
            
            // Add the button to the container
            buttonContainer.appendChild(addNortheasternButton);
          }
        }

        // Only show change button if there are multiple emails available
        if (availableEmails.length > 1) {
          // Create a dropdown select element
          selectDropdown = document.createElement("select");
          selectDropdown.style.padding = "5px";
          selectDropdown.style.fontSize = "12px";
          selectDropdown.style.cursor = "pointer";
          selectDropdown.style.width = "fit-content";

          // Add all available emails as options
          availableEmails.forEach((email) => {
            const option = document.createElement("option");
            option.value = email;
            option.textContent = email;
            // Select the recipientEmail (Northeastern primary for NEU domains, or first email otherwise)
            if (email === recipientEmail) {
              option.selected = true;
            }
            selectDropdown.appendChild(option);
          });

          // Handle selection change
          selectDropdown.onchange = () => {
            const newRecipient = selectDropdown.value.toLowerCase();

            // Update the displayed recipient
            recipientEmailText.textContent = `Recipient: ${newRecipient}`;

            const uniqueEmails = [...new Set(availableEmails)];
            bccEmailText.textContent = `BCC Addresses: ${uniqueEmails
              .filter((email) => email !== newRecipient)
              .join(", ")}`;

            // Update preview data with new recipient
            previewData[i] = {
              to: newRecipient,
              bcc: uniqueEmails.filter((email) => email !== newRecipient),
              subject: formattedSubject,
              body: formattedText
            };

            // Re-enable the send button and reset its text
            sendEmailButton.textContent = "Create Email Draft";
            sendEmailButton.disabled = false;

            // Update the sendEmailButton's onclick to use the new recipient
            sendEmailButton.onclick = () => {
              const uniqueEmails = [...new Set(availableEmails)];
              window.electronAPI.sendMessage("send-email", {
                recipient: newRecipient,
                bcc: uniqueEmails.filter((email) => email !== newRecipient),
                subject: formattedSubject,
                body: formattedText,
                importance: "Normal",
              });

              sendEmailButton.textContent = "Sent!";
              sendEmailButton.disabled = true;
            };
          };

          recipientSelectContainer.appendChild(recipientEmailText);
          recipientSelectContainer.appendChild(selectDropdown);
          recipientContainer.appendChild(recipientSelectContainer);
          recipientContainer.appendChild(bccEmailText);
        } else {
          // If only one or no emails, just show the recipient text
          recipientSelectContainer.appendChild(recipientEmailText);
          recipientContainer.appendChild(recipientSelectContainer);
          recipientContainer.appendChild(bccEmailText);
        }

        preview_list.appendChild(parentDiv);
        parentDiv.appendChild(label);
        parentDiv.appendChild(recipientContainer);
        parentDiv.appendChild(subjectPreview);
        parentDiv.appendChild(textarea);
      }
    } else {
      // If no CSV data, show message
      const message = document.createElement("div");
      message.textContent = "No CSV data available for preview";
      preview_list.appendChild(message);
    }
  });

// Helper function to escape special regex characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Helper function to escape CSV cell content
function escapeCsvCell(cell) {
  if (cell == null) return "";
  const cellStr = String(cell);
  if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n") || cellStr.includes("\r")) {
    return `"${cellStr.replace(/"/g, '""')}"`;
  }
  return cellStr;
}

// Function to save enriched CSV with To, BCC, Subject, Body columns
async function saveAsEnrichedCSV() {
  if (!enrichedCsvData || enrichedCsvData.length <= 1) {
    alert("No CSV data available to export.");
    return;
  }

  if (Object.keys(previewData).length === 0) {
    alert("Please generate a preview first before exporting.");
    return;
  }

  // Get original headers and add new columns
  const originalHeaders = enrichedCsvData[0].split(",").map((h) => h.trim());
  const newHeaders = [...originalHeaders, "To", "BCC", "Subject", "Body"];
  
  // Create CSV rows array
  const csvRows = [];
  
  // Add header row
  csvRows.push(newHeaders.map(h => escapeCsvCell(h)).join(","));
  
  // Process each data row
  for (let i = 1; i < enrichedCsvData.length; i++) {
    const originalRow = enrichedCsvData[i].split(",").map((d) => d.trim());
    
    // Get preview data for this row
    const rowPreview = previewData[i] || {};
    const toEmail = rowPreview.to || "";
    const bccEmails = rowPreview.bcc ? rowPreview.bcc.join("; ") : "";
    const subject = rowPreview.subject || "";
    const body = rowPreview.body || "";
    
    // Escape original row cells
    const escapedOriginalRow = originalRow.map(cell => escapeCsvCell(cell));
    
    // Escape new columns
    const escapedTo = escapeCsvCell(toEmail);
    const escapedBcc = escapeCsvCell(bccEmails);
    const escapedSubject = escapeCsvCell(subject);
    const escapedBody = escapeCsvCell(body);
    
    // Combine original and new columns
    const fullRow = [...escapedOriginalRow, escapedTo, escapedBcc, escapedSubject, escapedBody];
    csvRows.push(fullRow.join(","));
  }
  
  // Create CSV content
  const csvContent = csvRows.join("\n");
  
  // Use Electron's save dialog
  const defaultFileName = `enriched_emails_${Date.now()}.csv`;
  const result = await window.electronAPI.saveCsvFile(csvContent, defaultFileName);
  
  if (result.success) {
    alert("CSV file has been saved successfully!");
  } else if (!result.canceled) {
    alert("Failed to save CSV file: " + (result.error || "Unknown error"));
  }
}

// Add Save as CSV button handler
document.getElementById("saveAsCsv").addEventListener("click", saveAsEnrichedCSV);

// on page load, get emails from local storage and populate the textarea
window.addEventListener("DOMContentLoaded", () => {
  const emails = JSON.parse(localStorage.getItem("emails") || "[]");
  const emailsList = document.getElementById("emails-list");

  // Check if the element exists before trying to use it
  if (!emailsList) {
    console.error("Element with ID 'emails-list' not found");
    return;
  }
  const localData = localStorage.getItem("emailsAsCsv");
  enrichedCsvData = normalizeCsvRows(localData);
  displayCsvAsTable(enrichedCsvData);
  variables = getCSVHeaderNames(localData);
  const variables_list = document.getElementById("variables-list");
  for (const varName of variables) {
    if (!variables_list.innerText.includes(varName)) {
      const p = document.createElement("p");
      p.textContent = `{${varName}}`;
      variables_list.appendChild(p);
    }
  }

  // loop through emails and make a new <p> for each email in the emails-list div
  emails.forEach((email) => {
    const p = document.createElement("p");
    p.textContent = email;
    emailsList.appendChild(p);
  });
});
