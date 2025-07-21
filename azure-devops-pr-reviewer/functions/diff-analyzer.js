function summarizeChanges(changes) {
  let added = 0, deleted = 0, files = 0;
  for (const change of changes) {
    files++;
    if (change.changeType === 'add') added++;
    if (change.changeType === 'delete') deleted++;
  }
  return { files, added, deleted };
}

module.exports = { summarizeChanges };
