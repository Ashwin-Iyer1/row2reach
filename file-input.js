function displayCsvAsTable(csv) {
    const rows = csv.split(/\r?\n/).filter(row => row.trim() !== ''); // Split into rows and remove empty lines
    if (rows.length === 0) return;

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

document.getElementById('csv-input').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const csvContent = e.target.result;
            displayCsvAsTable(csvContent);
        };
        reader.readAsText(file);
    }
});
