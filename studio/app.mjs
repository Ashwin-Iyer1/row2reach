import { parseCsv, serializeCsv, validateTable, inspectContacts, exampleCsv } from './core.mjs';
import { createCsvUpload } from './upload.mjs';
const $ = id => document.getElementById(id);
let table = null, rows = [], selected = null;
function el(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
function error(message) { $('error').textContent = message; $('error').hidden = !message; }
function invalidateReview(message, notice = '') {
  table = null; rows = []; selected = null; $('export').disabled = true;
  $('contacts').replaceChildren(); $('preview').replaceChildren(el('p', message));
  $('variables').replaceChildren(); $('email-column').replaceChildren();
  ['total','ready','issues'].forEach(id => $(id).textContent = '0');
  $('notice').textContent = notice; error('');
}
function analyze() {
  upload.cancel();
  try {
    const candidate = validateTable(parseCsv($('csv').value));
    if (candidate.records.length > 1000) throw new Error('This workspace supports up to 1,000 contacts. Use a smaller CSV.');
    table = candidate;
    const previous = $('email-column').value;
    $('email-column').replaceChildren(...table.headers.map(header => { const option = el('option', header); option.value = header; return option; }));
    $('email-column').value = table.headers.includes(previous) ? previous : table.headers.find(header => /email/i.test(header)) || table.headers[0];
    $('variables').replaceChildren(...table.headers.map(header => { const button = el('button', `{${header}}`); button.type = 'button'; button.addEventListener('click', () => { const field = $('message'); field.setRangeText(`{${header}}`, field.selectionStart, field.selectionEnd, 'end'); field.focus(); score(); }); return button; }));
    selected = null; error(''); $('notice').textContent = `Inspected ${table.records.length} contacts. Your data stays in this tab.`; score();
  } catch (issue) {
    // Never keep a previous export enabled beneath newly invalid input.
    invalidateReview('Resolve the CSV error to review contacts.'); error(issue.message);
  }
}
function score() {
  if (!table) return;
  rows = inspectContacts(table, $('email-column').value, $('subject').value, $('message').value);
  $('total').textContent = String(rows.length); $('ready').textContent = String(rows.filter(row => row.ready).length); $('issues').textContent = String(rows.filter(row => !row.ready).length);
  $('export').disabled = !rows.some(row => row.ready);
  render();
}
function render() {
  const query = $('search').value.trim().toLowerCase();
  const visible = rows.filter(row => (!query || row.values.join(' ').toLowerCase().includes(query)) && ($('status').value === 'all' || ($('status').value === 'ready' ? row.ready : !row.ready)));
  if (!visible.some(row => row.id === selected)) selected = visible[0]?.id ?? null;
  $('contacts').replaceChildren(...visible.map(row => {
    const button = el('button', undefined, `contact${selected === row.id ? ' selected' : ''}`);
    button.type = 'button'; button.setAttribute('aria-pressed', String(selected === row.id));
    const copy = el('span'); copy.append(el('strong', row.values[0] || `Contact ${row.id}`), el('small', row.email || 'No email'));
    button.append(copy, el('span', row.ready ? 'Ready' : `${row.issues.length} issue${row.issues.length === 1 ? '' : 's'}`, `badge ${row.ready ? 'good' : 'attention'}`));
    button.addEventListener('click', () => { selected = row.id; render(); $('contacts').querySelector(`[data-id="${row.id}"]`)?.focus({preventScroll:true}); });
    button.dataset.id = row.id; return button;
  }));
  if (!visible.length) $('contacts').append(el('p', 'No contacts match these filters.', 'empty'));
  const row = rows.find(item => item.id === selected);
  const preview = $('preview'); preview.replaceChildren();
  if (!row) { preview.append(el('p','Choose another filter to review a contact.')); return; }
  preview.append(el('p', `DRAFT ${row.id} / ${rows.length}`, 'eyebrow'), el('p', `To: ${row.email || '(missing email)'}`, 'recipient'), el('h3', row.subject || '(missing subject)'), el('pre', row.body));
  if (row.issues.length) { const list = el('ul', undefined, 'issue-list'); row.issues.forEach(issue => list.append(el('li',issue))); preview.append(list); }
  else preview.append(el('p','All required fields are present. Review the message before using it.', 'ready-note'));
}
function exportDrafts() {
  const ready = rows.filter(row => row.ready);
  if (!ready.length) return;
  const csv = serializeCsv([['Email','Subject','Message'], ...ready.map(row => [row.email, row.subject, row.body])], {spreadsheetSafe:true});
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], {type:'text/csv;charset=utf-8'}));
  const link = el('a'); link.href = url; link.download = 'row2reach-reviewed-drafts.csv'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url),1000);
  $('notice').textContent = `Exported ${ready.length} draft${ready.length===1?'':'s'} as CSV. No messages were sent.`;
}
const upload = createCsvUpload({
  invalidate: () => invalidateReview('Reading the selected CSV…'),
  onText: text => { $('csv').value = text; analyze(); },
  onError: message => { invalidateReview('Resolve the upload error to review contacts.'); error(message); }
});
$('analyze').addEventListener('click',analyze);
$('sample').addEventListener('click',() => { $('csv').value = exampleCsv; analyze(); });
$('csv').addEventListener('input',() => { upload.cancel(); invalidateReview('Inspect the edited CSV to review up-to-date drafts.', 'CSV changed. Inspect contacts to refresh the review.'); });
['subject','message'].forEach(id => $(id).addEventListener('input',score));
$('email-column').addEventListener('change',score);
['search','status'].forEach(id => $(id).addEventListener(id==='search'?'input':'change',render));
$('export').addEventListener('click',exportDrafts);
$('upload').addEventListener('change',event => { const file=event.target.files[0]; if(!file)return; event.target.value=''; void upload.read(file); });
$('csv').value=exampleCsv; analyze();
