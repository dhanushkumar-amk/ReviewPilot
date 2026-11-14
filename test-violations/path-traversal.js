// Security: detect-non-literal-fs-filename (MEDIUM)
const fs = require("node:fs");

function readUploadedFile(userFilename) {
  return fs.readFileSync(userFilename, "utf8");
}

module.exports = { readUploadedFile };
