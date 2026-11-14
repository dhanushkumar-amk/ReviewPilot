// Advanced Bug Rules: no-async-promise-executor, no-constant-binary-expression, no-loss-of-precision, no-compare-neg-zero, no-unsafe-negation, no-fallthrough

function createAsyncPromise() {
  // no-async-promise-executor: unhandled errors in async executor leak silently
  return new Promise(async (resolve, reject) => {
    const res = await Promise.resolve(100);
    resolve(res);
  });
}

function checkContradiction(statusValue) {
  // no-constant-binary-expression: condition is always false
  if (statusValue === 1 && statusValue === 2) {
    return "impossible";
  }
  return "normal";
}

function computeLarge() {
  // no-loss-of-precision: exceeds Number.MAX_SAFE_INTEGER
  return 9007199254740993;
}

function checkZero(val) {
  // no-compare-neg-zero: -0 compares equal to +0 with strict equality
  if (val === -0) {
    return true;
  }
  return false;
}

function checkKeyNegation(key, target) {
  // no-unsafe-negation: parsed as (!key) in target
  if (!key in target) {
    return false;
  }
  return true;
}

function evaluateOption(option) {
  // no-fallthrough: missing break in case 1
  switch (option) {
    case 1:
      console.log("option 1");
    case 2:
      console.log("option 2");
      break;
  }
}

module.exports = {
  createAsyncPromise,
  checkContradiction,
  computeLarge,
  checkZero,
  checkKeyNegation,
  evaluateOption,
};
