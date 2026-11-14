// Security: detect-child-process (HIGH)
const { exec } = require("node:child_process");

function executeCommand(commandParam) {
  exec(commandParam, (error, stdout) => {
    if (error) console.error(error);
  });
}

module.exports = { executeCommand };

