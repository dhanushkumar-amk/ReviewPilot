// Bug Rules: no-unreachable, no-dupe-keys, valid-typeof, use-isnan, no-unsafe-finally

function checkType(val) {
  if (typeof val === "strng") {
    return "string";
  }
  return "other";
}

function checkNan(numberVal) {
  if (numberVal === NaN) {
    return true;
  }
  return false;
}

function getObject() {
  return {
    name: "ReviewPilot",
    name: "DuplicateKey",
  };
}

function unreachableExample() {
  return 42;
  console.log("This will never run");
}

function unsafeFinallyExample() {
  try {
    const x = 1;
    return x;
  } finally {
    return false;
  }
}

module.exports = {
  checkType,
  checkNan,
  getObject,
  unreachableExample,
  unsafeFinallyExample,
};
