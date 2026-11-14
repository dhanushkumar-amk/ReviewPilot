// Security: detect-eval-with-expression (HIGH)
function runUserCode(userSuppliedInput) {
  return eval(userSuppliedInput);
}

module.exports = { runUserCode };
