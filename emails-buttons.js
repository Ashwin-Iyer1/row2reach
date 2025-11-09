let variables = [];

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

    // Collect all available email addresses for this row
    const availableEmails = [];
    emailHeaderIndexes.forEach((idx) => {
      const email = (dataRow[idx] || "").trim();
      if (email) {
        availableEmails.push(email);
      }
    });

    // Pick the first email as recipient
    const recipient = availableEmails[0] || "";
    
    if (recipient) {
      // Send the email data to main process
      window.electronAPI.sendMessage("send-email", {
        recipient: recipient,
        bcc: availableEmails.filter((email) => email !== recipient),
        subject: formattedSubject,
        body: formattedText,
        importance: "Normal",
      });
      draftCount++;
    }
  }

  alert(`Successfully created ${draftCount} email drafts!`);
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

    // Collect all available email addresses for this row
    const availableEmails = [];
    emailHeaderIndexes.forEach((idx) => {
      const email = (dataRow[idx] || "").trim();
      if (email) {
        availableEmails.push(email);
      }
    });

    // Pick the first email as recipient
    const recipient = availableEmails[0] || "";
    
    if (recipient) {
      // Send the email immediately to main process
      window.electronAPI.sendMessage("send-mail-now", {
        recipient: recipient,
        bcc: availableEmails.filter((email) => email !== recipient),
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

    // Clear previous previews
    preview_list.innerHTML = "";

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
          window.electronAPI.sendMessage("send-email", {
            recipient: recipient,
            bcc: availableEmails.filter((email) => email !== recipient),
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
          window.electronAPI.sendMessage("send-mail-now", {
            recipient: recipient,
            bcc: availableEmails.filter((email) => email !== recipient),
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

        // Loop through those columns and pick the first filled one
        let recipient = "";
        for (const i of emailHeaderIndexes) {
          const value = (dataRow[i] || "").trim();
          if (value) {
            recipient = value;
            break;
          }
        }

        const recipientEmail = recipient || "";

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

        const bccEmailText = document.createElement("p");
        bccEmailText.textContent = `BCC Addresses: ${emailHeaderIndexes
          .map((idx) => (dataRow[idx] || "").trim())
          .filter((email) => email && email !== recipientEmail)
          .join(", ")}`;
        bccEmailText.style.fontSize = "12px";
        bccEmailText.style.color = "#cfcfcfff";

        // Collect all available email addresses for this row
        const availableEmails = [];
        emailHeaderIndexes.forEach((idx) => {
          const email = (dataRow[idx] || "").trim();
          if (email) {
            availableEmails.push(email);
          }
        });

        // Only show change button if there are multiple emails available
        if (availableEmails.length > 1) {
          // Create a dropdown select element
          const selectDropdown = document.createElement("select");
          selectDropdown.style.padding = "5px";
          selectDropdown.style.fontSize = "12px";
          selectDropdown.style.cursor = "pointer";
          selectDropdown.style.width = "fit-content";

          // Add all available emails as options
          availableEmails.forEach((email, index) => {
            const option = document.createElement("option");
            option.value = email;
            option.textContent = email;
            if (index === 0) {
              option.selected = true;
            }
            selectDropdown.appendChild(option);
          });

          // Handle selection change
          selectDropdown.onchange = () => {
            const newRecipient = selectDropdown.value;

            // Update the displayed recipient
            recipientEmailText.textContent = `Recipient: ${newRecipient}`;

            bccEmailText.textContent = `BCC Addresses: ${availableEmails
              .filter((email) => email !== newRecipient)
              .join(", ")}`;

            // Re-enable the send button and reset its text
            sendEmailButton.textContent = "Create Email Draft";
            sendEmailButton.disabled = false;

            // Update the sendEmailButton's onclick to use the new recipient
            sendEmailButton.onclick = () => {
              window.electronAPI.sendMessage("send-email", {
                recipient: newRecipient,
                bcc: availableEmails.filter((email) => email !== newRecipient),
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
  }); // Helper function to escape special regex characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
} // on page load, get emails from local storage and populate the textarea
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
