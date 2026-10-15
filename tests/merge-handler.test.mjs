import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeMergeHandler } from '../src/handlers/merge-handler.js';
import { setCsvRows, getCsvRows, setEnrichedCsvData, getEnrichedCsvData } from '../src/state/app-state.js';

function setup(t, mainRows) {
  const original = { document: globalThis.document, FileReader: globalThis.FileReader, alert: globalThis.alert };
  t.after(() => {
    for (const [name, value] of Object.entries(original)) {
      if (value === undefined) delete globalThis[name]; else globalThis[name] = value;
    }
  });
  const listeners = {}, alerts = [];
  const input = { value: 'contacts.csv', files: [{ name: 'contacts.csv' }], addEventListener: (event, callback) => { listeners[event] = callback; } };
  const button = { addEventListener() {} };
  let reader;
  globalThis.document = { getElementById: id => id === 'merge-csv-input' ? input : button };
  globalThis.alert = message => alerts.push(message);
  globalThis.FileReader = class { constructor() { reader = this; } readAsText() {} };
  setCsvRows(mainRows); setEnrichedCsvData(['existing enriched data']);
  initializeMergeHandler();
  return { input, alerts, start: () => { listeners.change({ target: input }); return reader; } };
}

test('malformed secondary CSV reports a useful error, resets input, and preserves data', t => {
  const rows = ['Full Name,Email', 'Avery Chen,avery@example.com'];
  const { start, input, alerts } = setup(t, rows);
  const reader = start();
  assert.doesNotThrow(() => reader.onload({ target: { result: 'Full Name,Email\n"unterminated' } }));
  assert.match(alerts[0], /Could not merge this CSV:.*quote/i);
  assert.equal(input.value, '');
  assert.deepEqual(getCsvRows(), rows);
  assert.deepEqual(getEnrichedCsvData(), ['existing enriched data']);
});
test('a malformed later primary row cannot leave partially appended headers or rows', t => {
  const rows = ['Full Name,Email', 'Avery Chen,avery@example.com', '"unclosed'];
  const before = [...rows];
  const { start, input, alerts } = setup(t, rows);
  start().onload({ target: { result: 'Full Name,Email\nAvery Chen,another@example.com' } });
  assert.match(alerts[0], /Could not merge this CSV/);
  assert.equal(input.value, '');
  assert.deepEqual(getCsvRows(), before);
  assert.deepEqual(getEnrichedCsvData(), ['existing enriched data']);
});
test('file read failures reset the input so the same file can be chosen again', t => {
  const { start, input, alerts } = setup(t, ['Full Name,Email']);
  const reader = start();
  reader.error = new Error('The file is unavailable');
  reader.onerror();
  assert.equal(input.value, '');
  assert.match(alerts[0], /file is unavailable/);
});
test('synchronous read failures are also handled without an uncaught event error', t => {
  const { start, input, alerts } = setup(t, ['Full Name,Email']);
  globalThis.FileReader = class { readAsText() { throw new Error('Read access denied'); } };
  assert.doesNotThrow(start);
  assert.equal(input.value, '');
  assert.match(alerts[0], /Read access denied/);
});
