/** Keep asynchronous file reads from replacing a newer edit or selection. */
export function createCsvUpload({ invalidate, onText, onError, maxBytes = 2_000_000 }) {
  let revision = 0;
  return {
    cancel() { revision += 1; },
    async read(file) {
      const current = ++revision;
      invalidate();
      try {
        if (file.size > maxBytes) throw new Error('Choose a CSV smaller than 2 MB.');
        const text = await file.text();
        if (current === revision) onText(text);
      } catch (issue) {
        if (current === revision) onError(issue instanceof Error ? issue.message : 'Unable to read this CSV. Choose the file again.');
      }
    }
  };
}
