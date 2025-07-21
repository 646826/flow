const { buildSummary } = require('../../functions/report-formatter');

test('buildSummary returns formatted string', () => {
  const summary = buildSummary({ files: 1, added: 5, deleted: 0, risk: 'Low' });
  expect(summary).toContain('Files changed: 1');
  expect(summary).toContain('Risk level: Low');
});
