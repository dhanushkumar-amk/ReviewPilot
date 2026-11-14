// Security: detect-possible-timing-attacks (MEDIUM)
function verifyPassword(userInput, password) {
  if (userInput === password) {
    return true;
  }
  return false;
}

module.exports = { verifyPassword };
