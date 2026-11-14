// Security: detect-unsafe-regex (MEDIUM)
function getEmailMatcher() {
  return new RegExp("^(a+)+$");
}

module.exports = { getEmailMatcher };

