function summarizeChanges(changes) {
  const summary = { files: 0, added: 0, deleted: 0, edited: 0 };
  
  for (const change of changes) {
    summary.files++;
    switch (change.changeType) {
      case 'add':
        summary.added++;
        break;
      case 'delete':
        summary.deleted++;
        break;
      case 'edit':
        summary.edited++;
        break;
    }
  }
  
  return summary;
}

module.exports = { summarizeChanges };
