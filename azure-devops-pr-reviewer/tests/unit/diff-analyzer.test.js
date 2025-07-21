const { summarizeChanges } = require('../../functions/diff-analyzer');

test('summarizeChanges counts files and types', () => {
  const changes = [
    { changeType: 'add' },
    { changeType: 'delete' },
    { changeType: 'edit' }
  ];
  const summary = summarizeChanges(changes);
  expect(summary.files).toBe(3);
  expect(summary.added).toBe(1);
  expect(summary.deleted).toBe(1);
});
