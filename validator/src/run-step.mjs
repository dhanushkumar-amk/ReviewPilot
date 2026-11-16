/**
 * run-step.mjs
 * Spawns a command in its own process group, captures output, and enforces timeouts.
 * No dependencies — Node built-ins only.
 * NEVER builds shell strings. All commands are fixed arrays.
 */

import { spawn } from "node:child_process";

const MAX_OUTPUT_BYTES = 1024 * 1024; // 1 MB buffer cap
const OUTPUT_TAIL_CHARS = 4000;

// ANSI/control character stripper
const STRIP_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]|(?:\x1B|\x9B)[[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

/**
 * Scrubbed environment for child processes.
 * Contains ONLY: PATH, HOME, TMPDIR, CI, npm_config_cache,
 * npm_config_update_notifier, npm_config_fund, npm_config_audit.
 * Never passes AWS_*, LAMBDA_*, or any secret.
 */
export function buildScrubbedEnv(runDir) {
  return {
    PATH: process.env.PATH || "/var/lang/bin:/usr/local/bin:/usr/bin:/bin:/opt/bin",
    HOME: runDir,
    TMPDIR: "/tmp",
    CI: "true",
    npm_config_cache: `${runDir}/.npm`,
    npm_config_update_notifier: "false",
    npm_config_fund: "false",
    npm_config_audit: "false",
  };
}

function stripControlChars(str) {
  return str.replace(STRIP_RE, "");
}

function truncateToTail(str) {
  const stripped = stripControlChars(str);
  if (stripped.length > OUTPUT_TAIL_CHARS) {
    return stripped.slice(-OUTPUT_TAIL_CHARS);
  }
  return stripped;
}

/**
 * Spawn a process in its own process group (detached: true) with a scrubbed env.
 * Returns { status, exitCode, durationMs, outputTail }.
 *
 * @param {string} cmd - executable name
 * @param {string[]} args - argument array (NO shell interpolation ever)
 * @param {{ env: object, cwd: string, timeoutMs: number }} opts
 */
export async function spawnProcessGroup(cmd, args, { env, cwd, timeoutMs }) {
  return new Promise((resolve) => {
    const startMs = Date.now();
    let outputBuffer = "";
    let bufferBytes = 0;
    let truncated = false;
    let timedOut = false;

    const child = spawn(cmd, args, {
      cwd,
      env,
      shell: false,
      detached: true, // own process group for SIGKILL
      stdio: ["ignore", "pipe", "pipe"],
    });

    const pgid = child.pid;

    function killGroup() {
      try {
        if (pgid) process.kill(-pgid, "SIGKILL");
      } catch {}
    }

    const timer = setTimeout(() => {
      timedOut = true;
      killGroup();
    }, timeoutMs);

    function appendOutput(data) {
      const str = typeof data === "string" ? data : data.toString("utf8");
      if (!truncated) {
        bufferBytes += Buffer.byteLength(str, "utf8");
        if (bufferBytes > MAX_OUTPUT_BYTES) {
          truncated = true;
          // Keep only the last part going forward
          outputBuffer = outputBuffer.slice(-OUTPUT_TAIL_CHARS / 2);
        }
      }
      // Even when truncated, keep appending so we have the latest output
      outputBuffer += str;
      // Keep buffer from growing indefinitely
      if (outputBuffer.length > OUTPUT_TAIL_CHARS * 2) {
        outputBuffer = outputBuffer.slice(-OUTPUT_TAIL_CHARS);
      }
    }

    child.stdout.on("data", appendOutput);
    child.stderr.on("data", appendOutput);

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        status: "FAILED",
        exitCode: -1,
        durationMs: Date.now() - startMs,
        outputTail: truncateToTail(outputBuffer || err.message),
        stdout: "",
      });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      // Give the OS a tick to reap any immediate children
      setImmediate(() => {
        // Best-effort: kill the whole process group to ensure no orphans
        killGroup();

        const durationMs = Date.now() - startMs;
        const tail = truncateToTail(outputBuffer);

        if (timedOut) {
          resolve({
            status: "FAILED",
            exitCode: -1,
            durationMs,
            outputTail: tail,
            stdout: "",
            timedOut: true,
          });
          return;
        }

        const exitCode = code ?? -1;
        resolve({
          status: exitCode === 0 ? "PASSED" : "FAILED",
          exitCode,
          durationMs,
          outputTail: tail,
          stdout: tail, // alias for archive listing
        });
      });
    });
  });
}

/**
 * Run a step command with the scrubbed environment.
 */
export async function runStep({ command, cwd, timeoutMs, runDir }) {
  const [cmd, ...args] = command;
  const env = buildScrubbedEnv(runDir);
  return await spawnProcessGroup(cmd, args, { env, cwd, timeoutMs });
}
