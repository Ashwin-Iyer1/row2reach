/** Shared, dependency-free CSV and campaign preflight logic. Never sends mail. */
export function parseCsv(text) {
  if (typeof text !== 'string') throw new TypeError('CSV must be text.');
  text = text.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], cell = '', quoted = false, closed = false;
  const finishCell = () => { row.push(cell); cell = ''; closed = false; };
  const finishRow = () => { finishCell(); if (row.some(value => value.trim() !== '')) rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else cell += char;
    } else if (char === ',') finishCell();
    else if (char === '\n' || char === '\r') { if (char === '\r' && text[i + 1] === '\n') i++; finishRow(); }
    else if (char === '"') {
      if (cell.length || closed) throw new Error(`Unexpected quote near character ${i + 1}. Quote the entire field and double embedded quotes.`);
      quoted = true;
    } else {
      if (closed && char.trim()) throw new Error(`Unexpected text after a closing quote near character ${i + 1}.`);
      if (!closed) cell += char;
    }
  }
  if (quoted) throw new Error('A quoted field is not closed. Check the last double quote.');
  if (cell.length || row.length || closed) finishRow();
  return rows;
}

export function escapeCell(value, spreadsheetSafe = false) {
  let text = String(value ?? '');
  if (spreadsheetSafe && /^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return /[,"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function serializeCsv(rows, { spreadsheetSafe = false } = {}) {
  return rows.map(row => row.map(value => escapeCell(value, spreadsheetSafe)).join(',')).join('\r\n');
}

export function validateTable(rows) {
  if (!rows.length) throw new Error('Add a header row and at least one contact.');
  const headers = rows[0].map(value => value.trim());
  if (headers.some(value => !value)) throw new Error('Every column needs a name.');
  if (new Set(headers.map(value => value.toLowerCase())).size !== headers.length) throw new Error('Column names must be unique, ignoring capitalization.');
  if (rows.length < 2) throw new Error('The file has headers but no contacts.');
  const invalid = rows.findIndex(row => row.length !== headers.length);
  if (invalid !== -1) throw new Error(`Record ${invalid + 1} has ${rows[invalid].length} fields; expected ${headers.length}. Quote commas inside values.`);
  return { headers, records: rows.slice(1).map((values, index) => ({ id: index + 1, values })) };
}

export function templateVariables(template) {
  return [...new Set([...String(template).matchAll(/\{([^{}]+)\}/g)].map(match => match[1]))];
}

export function renderTemplate(template, headers, values) {
  return String(template).replace(/\{([^{}]+)\}/g, (match, key) => {
    const index = headers.indexOf(key);
    return index < 0 ? match : values[index] ?? '';
  });
}

export function inspectContacts(table, emailColumn, subject, body) {
  const emailIndex = table.headers.indexOf(emailColumn);
  const variables = templateVariables(`${subject}\n${body}`);
  const unknown = variables.filter(key => !table.headers.includes(key));
  const seen = new Set();
  return table.records.map(record => {
    const email = (record.values[emailIndex] || '').trim();
    const key = email.toLowerCase();
    const issues = [];
    if (!email) issues.push('Missing email');
    else if (!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(email)) issues.push('Invalid email format');
    if (key && seen.has(key)) issues.push('Duplicate email');
    if (key) seen.add(key);
    unknown.forEach(variable => issues.push(`Unknown variable: {${variable}}`));
    variables.filter(variable => table.headers.includes(variable) && !record.values[table.headers.indexOf(variable)]?.trim()).forEach(variable => issues.push(`Missing value: ${variable}`));
    if (!subject.trim()) issues.push('Missing subject');
    if (!body.trim()) issues.push('Missing message');
    return { ...record, email, issues, ready: issues.length === 0, subject: renderTemplate(subject, table.headers, record.values), body: renderTemplate(body, table.headers, record.values) };
  });
}

export const exampleCsv = serializeCsv([
  ['Name','Organization','Email','Role'],
  ['Avery Chen','Northstar Research','avery@example.com','Research engineer'],
  ['Jordan Ellis','Fieldwork Labs','jordan@example.com','Data scientist'],
  ['Sam Rivera','Cedar Analytics','','Analyst'],
  ['Riley Morgan','Atlas, Inc.','riley.example.com','Product engineer'],
  ['Avery Chen','Northstar Research','AVERY@example.com','Research engineer'],
  ['Taylor Brooks','Harbor Systems','taylor@example.com',''],
]);
