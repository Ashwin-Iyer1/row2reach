import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, serializeCsv, validateTable, inspectContacts, renderTemplate, exampleCsv } from '../studio/core.mjs';
import { normalizeCsvRows, parseRowColumns, setEmailInRow, updateRowCell } from '../src/utils/csv-utils.js';

test('desktop editor roundtrips quoted and multiline fields while updating an email', () => {
  const csv = 'Name,Note,Email\r\n"Chen, Avery","two\nlines and ""quotes""",old@example.com';
  const rows = normalizeCsvRows(csv);
  assert.equal(rows.length, 2);
  const updated = setEmailInRow(rows[0], rows[1], 'new@example.com', 'Email');
  assert.deepEqual(parseRowColumns(updated), ['Chen, Avery', 'two\nlines and "quotes"', 'new@example.com']);
  assert.deepEqual(parseRowColumns(updateRowCell(updated, 1, 'another, value')), ['Chen, Avery','another, value','new@example.com']);
});

test('CSV roundtrip preserves commas, CRLF, quotes, whitespace and empty trailing cells', () => {
  const rows = [['Name','Note','Email'], ['  Avery ','A "quoted", two\r\nline note',''], ['Casey','plain','casey@example.com']];
  assert.deepEqual(parseCsv('\uFEFF'+serializeCsv(rows)),rows);
});
test('malformed CSV fails instead of shifting fields', () => {
  for(const source of ['Name\n"open','Name\n"x"oops','Name\nun"quoted']) assert.throws(() => parseCsv(source));
  assert.throws(() => validateTable(parseCsv('Name,Email\nAvery,one,two')),/Record 2/);
  assert.throws(() => validateTable(parseCsv('Name,name\nA,B')),/unique/);
});
test('empty records are ignored, empty quoted fields remain in populated records', () => {
  assert.deepEqual(parseCsv('\r\nName,Email\r\n\r\nAvery,""\r\n'),[['Name','Email'],['Avery','']]);
});
test('preflight detects format, duplicates and missing template values independently', () => {
  const table=validateTable(parseCsv(exampleCsv));
  const results=inspectContacts(table,'Email','Hello {Name}','About {Role} at {Organization}');
  assert.equal(results.filter(row=>row.ready).length,2);
  assert.deepEqual(results[2].issues,['Missing email']);
  assert.deepEqual(results[3].issues,['Invalid email format']);
  assert.deepEqual(results[4].issues,['Duplicate email']);
  assert.deepEqual(results[5].issues,['Missing value: Role']);
});
test('unknown placeholders and blank drafts block export readiness', () => {
  const table=validateTable(parseCsv(exampleCsv));
  assert.ok(inspectContacts(table,'Email','Hello {Missing}','Message').every(row=>!row.ready));
  assert.ok(inspectContacts(table,'Email','','Message').every(row=>!row.ready));
  assert.ok(inspectContacts(table,'Email','Subject','').every(row=>!row.ready));
});
test('template values are literal and missing names remain reviewable', () => {
  assert.equal(renderTemplate('{Name} — {Unknown}',['Name'],['$& <script>']), '$& <script> — {Unknown}');
});
test('spreadsheet export neutralizes leading formulas without mutating input', () => {
  const rows=[['Name'],['=2+2'],[' @SUM(A1)'],['ordinary']];
  assert.deepEqual(parseCsv(serializeCsv(rows,{spreadsheetSafe:true})),[['Name'],["'=2+2"],["' @SUM(A1)"],['ordinary']]);
  assert.equal(rows[1][0],'=2+2');
});
