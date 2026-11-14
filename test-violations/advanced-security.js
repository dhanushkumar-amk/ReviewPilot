// Advanced Security Rules: no-implied-eval, no-new-func, no-script-url, no-proto

function runTimer(param) {
  // no-implied-eval: Passing code string to setTimeout evaluates dynamically
  setTimeout("console.log(" + param + ")", 500);
}

function dynamicCompile(codeBody) {
  // no-new-func: Function constructor allows code injection
  const dynamicFn = new Function("a", "b", codeBody);
  return dynamicFn(1, 2);
}

function navigateHome() {
  // no-script-url: javascript: URL protocol opens XSS vectors
  window.location.href = "javascript:void(0)";
}

function inspectPrototype(obj) {
  // no-proto: Prototype pollution vector through __proto__
  return obj.__proto__;
}

module.exports = {
  runTimer,
  dynamicCompile,
  navigateHome,
  inspectPrototype,
};
