function buildSummary({ files, added, deleted, risk }) {
  return `\uD83D\uDCCA PR Analysis Summary\n` +
    `• Files changed: ${files}\n` +
    `• Lines added: +${added}\n` +
    `• Lines removed: -${deleted}\n` +
    `• Risk level: ${risk}`;
}

module.exports = { buildSummary };
