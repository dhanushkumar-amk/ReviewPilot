/**
 * scripts/validator-smoke.ts
 * Smoke-tests the Lambda validator with a tiny in-memory tarball.
 * Prints step names, statuses, durations, and node/npm versions.
 * NEVER prints presigned URLs, AWS keys, or file contents.
 */

import crypto from "node:crypto";
import zlib from "node:zlib";
import { promisify } from "node:util";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import {
  LambdaClient,
  InvokeCommand,
} from "@aws-sdk/client-lambda";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";

dotenv.config();

const gzip = promisify(zlib.gzip);

// Validate required env
const required = [
  "AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY",
  "SANDBOX_LAMBDA_FUNCTION", "SANDBOX_BUCKET",
];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

const REGION = process.env.AWS_REGION!;
const FUNCTION_NAME = process.env.SANDBOX_LAMBDA_FUNCTION!;
const BUCKET = process.env.SANDBOX_BUCKET!;

const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
};

const s3 = new S3Client({ region: REGION, credentials });
const lambda = new LambdaClient({ region: REGION, credentials, maxAttempts: 1 });

/**
 * Build a minimal .tar.gz in memory containing:
 *   - <topDir>/package.json (with a "test" script that checks vuln.js and prints tests-ok)
 *   - <topDir>/vuln.js (a valid JS file)
 */
async function buildSmokeTarball(): Promise<Buffer> {
  const topDir = "smoke-repo";

  const pkgJson = JSON.stringify({
    name: "smoke-test",
    version: "1.0.0",
    scripts: {
      test: 'node --check vuln.js && echo "tests-ok"',
    },
  }, null, 2);

  const vulnJs = "// placeholder file\nconsole.log('hello');\n";

  // Build a minimal POSIX tar manually
  function tarHeader(name: string, size: number): Buffer {
    const header = Buffer.alloc(512, 0);
    // name (100 bytes)
    header.write(name, 0, "ascii");
    // mode (8 bytes)
    header.write("0000644\0", 100, "ascii");
    // uid, gid (8 bytes each)
    header.write("0000000\0", 108, "ascii");
    header.write("0000000\0", 116, "ascii");
    // size (12 bytes, octal)
    header.write(size.toString(8).padStart(11, "0") + "\0", 124, "ascii");
    // mtime (12 bytes)
    const mtime = Math.floor(Date.now() / 1000);
    header.write(mtime.toString(8).padStart(11, "0") + "\0", 136, "ascii");
    // type flag: '0' = regular file
    header.write("0", 156, "ascii");
    // magic
    header.write("ustar  \0", 257, "ascii");
    // Compute checksum
    let checksum = 0;
    for (let i = 0; i < 512; i++) checksum += header[i];
    // Add 256 for 8 spaces placeholder
    checksum += 256;
    // Actually recompute: set checksum field to spaces first
    header.fill(0x20, 148, 156);
    // Recompute proper checksum
    let cs = 0;
    for (let i = 0; i < 512; i++) cs += header[i];
    header.write(cs.toString(8).padStart(6, "0") + "\0 ", 148, "ascii");
    return header;
  }

  function tarEntry(name: string, content: string): Buffer {
    const data = Buffer.from(content, "utf8");
    const header = tarHeader(name, data.length);
    // Pad data to 512-byte blocks
    const padded = Buffer.alloc(Math.ceil(data.length / 512) * 512, 0);
    data.copy(padded);
    return Buffer.concat([header, padded]);
  }

  const entries = Buffer.concat([
    tarEntry(`${topDir}/package.json`, pkgJson),
    tarEntry(`${topDir}/vuln.js`, vulnJs),
    Buffer.alloc(1024, 0), // EOF: two 512-byte blocks of zeros
  ]);

  return await gzip(entries);
}

async function main() {
  const runId = crypto.randomUUID();
  const smokeKey = `validation/smoke-${runId.slice(0, 8)}.tar.gz`;
  let uploaded = false;

  console.log(`\n[smoke] Starting smoke test (runId=${runId.slice(0, 8)}...)`);

  try {
    const tarball = await buildSmokeTarball();

    // Upload to S3
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: smokeKey,
      Body: tarball,
      ContentType: "application/gzip",
    }));
    uploaded = true;
    console.log(`[smoke] Uploaded archive to S3`);

    // Presign GET URL (never printed)
    const presignedUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: BUCKET, Key: smokeKey }),
      { expiresIn: 300 }
    );

    // Build patched content and sha256
    const patchedContent = "// patched placeholder\nconsole.log('patched');\n";
    const patchedSha256 = crypto.createHash("sha256").update(patchedContent, "utf8").digest("hex");

    // Build Lambda payload
    const payload = {
      runId,
      downloadUrl: presignedUrl,
      targetPath: "vuln.js",
      patchedContentBase64: Buffer.from(patchedContent, "utf8").toString("base64"),
      originalContentBase64: Buffer.from("// placeholder file\nconsole.log('hello');\n", "utf8").toString("base64"),
      patchedSha256,
      limits: {
        maxArchiveBytes: 10 * 1024 * 1024,
        maxFiles: 100,
        maxTotalBytes: 20 * 1024 * 1024,
      },
    };

    console.log(`[smoke] Invoking Lambda...`);
    const start = Date.now();

    const invokeRes = await lambda.send(new InvokeCommand({
      FunctionName: FUNCTION_NAME,
      InvocationType: "RequestResponse",
      Payload: Buffer.from(JSON.stringify(payload)),
    }));

    const elapsed = Date.now() - start;

    if (invokeRes.FunctionError) {
      const errPayload = invokeRes.Payload
        ? Buffer.from(invokeRes.Payload).toString("utf8")
        : "(no payload)";
      console.error(`[smoke] Lambda FunctionError after ${elapsed}ms: ${errPayload}`);
      process.exit(1);
    }

    const responseStr = invokeRes.Payload
      ? Buffer.from(invokeRes.Payload).toString("utf8")
      : "{}";
    const result = JSON.parse(responseStr);

    console.log(`\n[smoke] Lambda responded in ${elapsed}ms`);
    console.log(`Node version: ${result.nodeVersion ?? "unknown"}`);
    console.log(`npm version:  ${result.npmVersion ?? "unknown"}`);
    console.log();

    if (!result.steps || result.steps.length === 0) {
      console.log(`[smoke] No steps returned. errorCode=${result.errorCode ?? "none"}`);
    } else {
      const nameWidth = 12;
      const statusWidth = 8;
      for (const step of result.steps) {
        const name = String(step.name).padEnd(nameWidth);
        const status = String(step.status).padEnd(statusWidth);
        const dur = step.durationMs != null ? `${step.durationMs} ms` : "";
        const note = step.note ? `  (${step.note})` : "";
        console.log(`${name} ${status} ${dur}${note}`);
      }
    }

    if (result.errorCode) {
      console.log(`\n[smoke] Error code: ${result.errorCode}`);
    }

    console.log("\n[smoke] Done.");
  } finally {
    if (uploaded) {
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: smokeKey })).catch(() => {});
      console.log(`[smoke] Deleted S3 object`);
    }
  }
}

main().catch((err) => {
  console.error("[smoke] Fatal error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
