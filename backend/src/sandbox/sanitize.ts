import { redactCode } from "../ai/redact.js";

// ANSI escape code stripper
const ANSI_REGEX = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

// Control characters except newline (\n), carriage return (\r), and tab (\t)
const CONTROL_CHARS_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

export function sanitizeOutputTail(raw: string | undefined | null): string {
  if (!raw || typeof raw !== "string") {
    return "";
  }

  // 1. Strip ANSI escape sequences
  let cleaned = raw.replace(ANSI_REGEX, "");

  // 2. Strip control characters
  cleaned = cleaned.replace(CONTROL_CHARS_REGEX, "");

  // 3. Keep the last 4000 characters
  if (cleaned.length > 4000) {
    cleaned = cleaned.slice(-4000);
  }

  // 4. Redact sensitive secrets (tokens, private keys, AWS keys, etc.)
  const { text } = redactCode(cleaned);

  return text;
}

