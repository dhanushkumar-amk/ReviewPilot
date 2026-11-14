/**
 * Redaction pass for sensitive credentials & secrets before sending code to AI models.
 * Matches: AWS keys, GitHub tokens, Slack tokens, JWTs, private keys, secret/password/token assignments, and high-entropy strings.
 */

// Patterns to detect and redact
const AWS_KEY_REGEX = /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g;
const GITHUB_TOKEN_REGEX = /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,255}/g;
const SLACK_TOKEN_REGEX = /xox[baprs]-[0-9a-zA-Z]{10,48}/g;
const JWT_REGEX = /\beyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g;
const PRIVATE_KEY_REGEX = /-----BEGIN[ A-Z0-9_-]+PRIVATE KEY-----[\s\S]*?-----END[ A-Z0-9_-]+PRIVATE KEY-----/g;

// Assignment patterns: (password|secret|token|api_key|apikey|auth_token) = "..." / '...'
const SENSITIVE_ASSIGNMENT_REGEX =
  /(?<=\b(?:password|secret|token|api[_-]?key|client[_-]?secret|auth[_-]?token)\s*[:=]\s*["'])(?:[^"'\r\n]{8,})(?=["'])/gi;

// High-entropy token strings (e.g. Bearer hex/base64 strings >= 32 chars)
const HIGH_ENTROPY_BEARER_REGEX = /(?<=Bearer\s+)[A-Za-z0-9-_]{32,}/gi;

export interface RedactResult {
  text: string;
  redacted: boolean;
}

export function redactCode(rawText: string): RedactResult {
  if (!rawText) {
    return { text: rawText, redacted: false };
  }

  let text = rawText;

  text = text.replace(PRIVATE_KEY_REGEX, "[REDACTED PRIVATE KEY]");
  text = text.replace(AWS_KEY_REGEX, "[REDACTED]");
  text = text.replace(GITHUB_TOKEN_REGEX, "[REDACTED]");
  text = text.replace(SLACK_TOKEN_REGEX, "[REDACTED]");
  text = text.replace(JWT_REGEX, "[REDACTED]");
  text = text.replace(SENSITIVE_ASSIGNMENT_REGEX, "[REDACTED]");
  text = text.replace(HIGH_ENTROPY_BEARER_REGEX, "[REDACTED]");

  const redacted = text !== rawText;
  return { text, redacted };
}

