import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCsvUpload } from '../studio/upload.mjs';

function setup() {
  const state = { ready: true, text: 'previous review', errors: [] };
  const upload = createCsvUpload({
    invalidate: () => { state.ready = false; },
    onText: text => { state.text = text; state.ready = true; },
    onError: message => state.errors.push(message)
  });
  return { upload, state };
}
function deferredFile() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { file: { size: 10, text: () => promise }, resolve, reject };
}

test('oversized and unreadable uploads invalidate the previous review', async () => {
  for (const file of [
    { size: 2_000_001, text: () => assert.fail('An oversized file must not be read') },
    { size: 10, text: async () => { throw new Error('File is no longer available'); } }
  ]) {
    const { upload, state } = setup();
    await upload.read(file);
    assert.equal(state.ready, false);
    assert.equal(state.text, 'previous review');
    assert.equal(state.errors.length, 1);
  }
});
test('pending uploads immediately invalidate the review, and a newer edit wins', async () => {
  const { upload, state } = setup();
  const pending = deferredFile();
  const read = upload.read(pending.file);
  assert.equal(state.ready, false);
  upload.cancel();
  state.text = 'newly edited CSV';
  pending.resolve('older uploaded CSV');
  await read;
  assert.equal(state.text, 'newly edited CSV');
  assert.equal(state.ready, false);
});
test('the latest file wins even if an earlier read finishes last', async () => {
  const { upload, state } = setup();
  const older = deferredFile();
  const newer = deferredFile();
  const first = upload.read(older.file);
  const second = upload.read(newer.file);
  newer.resolve('latest CSV');
  await second;
  older.resolve('stale CSV');
  await first;
  assert.equal(state.text, 'latest CSV');
  assert.equal(state.ready, true);
});
test('an error from an abandoned read cannot erase the newer successful review', async () => {
  const { upload, state } = setup();
  const older = deferredFile();
  const first = upload.read(older.file);
  await upload.read({ size: 10, text: async () => 'latest CSV' });
  older.reject(new Error('old read failed'));
  await first;
  assert.equal(state.text, 'latest CSV');
  assert.equal(state.ready, true);
  assert.deepEqual(state.errors, []);
});
