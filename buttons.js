function displayCsvAsTable(csv) {
    // Handle both string and array inputs
    let rows;
    if (Array.isArray(csv)) {
        rows = csv.filter(row => row.trim() !== ''); // Filter out empty rows
    } else {
        rows = csv.split(/\r?\n/).filter(row => row.trim() !== ''); // Split into rows and remove empty lines
    }
    
    if (rows.length === 0) return;
    window.dispatchEvent(new CustomEvent('csv:rows-updated', { detail: rows }));
    const table = document.createElement('table');
    table.border = '1'; // Basic styling

    // Create table header
    const headers = rows[0].split(',');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText.trim();
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create table body
    const tbody = document.createElement('tbody');
    for (let i = 1; i < rows.length; i++) {
        const rowData = rows[i].split(',');
        const tr = document.createElement('tr');
        rowData.forEach(cellData => {
            const td = document.createElement('td');
            td.textContent = cellData.trim();
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    const container = document.getElementById('table-container');
    container.innerHTML = ''; // Clear previous content
    container.appendChild(table);
}
let csvRows = [];
let enrichedCsvData = []; // Store the enriched data

window.addEventListener("csv:rows-updated", (e) => {
  csvRows = e.detail;
  enrichedCsvData = [...csvRows]; // Initialize with original CSV data
  console.log("CSV rows updated:", csvRows);
});

const replaceText = (selector, text) => {
  const element = document.getElementById(selector);
  if (element) element.innerText = text;
};

document.getElementById("apollo-button").addEventListener("click", function () {
  if (!csvRows.length) {
    alert("Load a CSV first");
    return;
  }
  const details = csvRows.slice(1).map((line) => {
    const [name, domain, organization, linkedin] = line.split(",");
    return {
      name: name?.trim(),
      organization_name: organization?.trim(),
      linkedin_url: linkedin?.trim(),
    };
  });
  console.log("Apollo clicked with details:", details);

  const url =
    "https://api.apollo.io/api/v1/people/bulk_match?reveal_personal_emails=false&reveal_phone_number=false";
  const headers = {
    accept: "application/json",
    "Cache-Control": "no-cache",
    "Content-Type": "application/json",
    "x-api-key": window.env.electron_key,
  };
  const body = JSON.stringify({ details: details });

  fetch(url, {
    method: "POST",
    headers: headers,
    body: body,
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Success:", data);
      // Handle the case where data is directly an array of matches
      const matchesList = Array.isArray(data) ? data : data.matches || [];

      // Create enriched CSV data with email column
      enrichedCsvData = [...csvRows];
      
      // Add email column header if it's the first row
      if (enrichedCsvData.length > 0) {
        const headerRow = enrichedCsvData[0].split(",");
        if (!headerRow.includes("Apollo Email")) {
          enrichedCsvData[0] = enrichedCsvData[0] + ",Apollo Email";
        }
      }

      // Add emails to corresponding rows
      matchesList.forEach((match, index) => {
        const dataRowIndex = index + 1; // Skip header row
        if (dataRowIndex < enrichedCsvData.length && match && match.email) {
          const currentRow = enrichedCsvData[dataRowIndex].split(",");
          // Check if email column already exists, if not add it
          if (currentRow.length < 5) {
            enrichedCsvData[dataRowIndex] = enrichedCsvData[dataRowIndex] + "," + match.email;
          } else {
            // Replace existing email column
            currentRow[4] = match.email;
            enrichedCsvData[dataRowIndex] = currentRow.join(",");
          }
        } else if (dataRowIndex < enrichedCsvData.length) {
          // No email found, add empty email column
          const currentRow = enrichedCsvData[dataRowIndex].split(",");
          if (currentRow.length < 5) {
            enrichedCsvData[dataRowIndex] = enrichedCsvData[dataRowIndex] + ",";
          }
        }
      });

      // Display the enriched CSV as a table
      displayCsvAsTable(enrichedCsvData);

      // Extract all emails for display in the apollo-data element
      const emails = matchesList
        .filter((match) => match && match.email)
        .map((match) => match.email);
      const emailText =
        emails.length > 0 ? emails.join(", ") : "No emails found";
      console.log(emailText);

      replaceText("apollo-data", emailText);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
});

document
  .getElementById("zero-bounce-button")
  .addEventListener("click", function () {
    if (!enrichedCsvData.length) {
      alert("No CSV data available. Please load and process data with Apollo first.");
      return;
    }    
    // Convert to CSV string
    const csvContent = enrichedCsvData.join('\n');
    
    // Create a Blob from the CSV content
    const blob = new Blob([csvContent], { type: 'text/csv' });
    
    // Create FormData and append the file
    const formData = new FormData();
    formData.append('file', blob, 'enriched_data.csv');
    formData.append('api_key', window.env.zerobounce_key);
    formData.append('domain_column', '2'); // Organization column (1-indexed)
    formData.append('full_name_column', '1'); // Name column (1-indexed)
    formData.append('has_header_row', 'true');

    const url = "https://bulkapi.zerobounce.net/email-finder/sendfile";

    fetch(url, {
        method: "POST",
        body: formData,
    })
    .then((response) => response.json())
    .then((data) => {
        console.log("Zero Bounce Success:", data);
        if (data.success) {
          document.getElementById("zero-bounce-data").innerText = 
            `File submitted successfully. File ID: ${data.file_id}`;
        } else {
          document.getElementById("zero-bounce-data").innerText = 
            `Error: ${data.error_message || data.message}`;
        }
    })
    .catch((error) => {
        console.error("Zero Bounce Error:", error);
        document.getElementById("zero-bounce-data").innerText = 
          "Error submitting file to Zero Bounce";
    });
    
    console.log("Zero Bounce clicked");
  });
document
  .getElementById("contact-out-button")
  .addEventListener("click", function () {
    console.log("Contact Out clicked");
    document.getElementById("contact-out-data").innerText =
      "Fetched Contact Out Data";
  });
