# Test Violations

This folder contains intentional test violation files for verifying ReviewPilot's static analyzer and AI assist capabilities:

- `eval-injection.js`: `security/detect-eval-with-expression` (HIGH severity)
- `command-injection.js`: `security/detect-child-process` (HIGH severity)
- `path-traversal.js`: `security/detect-non-literal-fs-filename` (MEDIUM severity)
- `timing-attack.js`: `security/detect-possible-timing-attacks` (MEDIUM severity)
- `unsafe-regex.js`: `security/detect-unsafe-regex` (MEDIUM severity)
- `bugs.js`: `valid-typeof`, `use-isnan`, `no-dupe-keys`, `no-unreachable`, `no-unsafe-finally` (MEDIUM severity bugs)

