const path = require('path');

function isSupported(filePath, extensions) {
  return extensions.includes(path.extname(filePath));
}

function extractContent(change) {
  if (change && change.item && change.item.path) {
    return {
      path: change.item.path,
      changeType: change.changeType,
      content: change.newContent && change.newContent.content
    };
  }
  return null;
}

module.exports = { isSupported, extractContent };
