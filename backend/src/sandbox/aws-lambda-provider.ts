/**
 * sandbox/aws-lambda-provider.ts
 * Implements SandboxProvider using AWS Lambda + S3.
 *
 * Flow:
 *   1. Check quota and increment atomically BEFORE any work
 *   2. Download repo tarball from GitHub using the GitHub App Octokit
 *   3. PutObject to S3 at validation/<validationId>.tar.gz
 *   4. Create presigned GET URL (TTL from env, capped at 600 s)
 *   5. Invoke Lambda (RequestResponse, maxAttempts 1, NO retries)
 *   6. Treat FunctionError or malformed response as LAMBDA_FAILED
 *   7. ALWAYS delete S3 object in finally
 *   8. Record seconds in SandboxUsage
 *
 * Security:
 *   - AWS credentials are ONLY passed to the SDK clients here — nowhere else.
 *   - Presigned URLs are NEVER logged.
 *   - Lambda payload contains NO AWS keys, tokens, or database URLs.
 */

import crypto from "node:crypto";
import { Readable } from "node:stream";
import {
  LambdaClient,
  InvokeCommand,
  type InvokeCommandOutput,
} from "@aws-sdk/client-lambda";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import { env } from "../env.js";
import { githubApp } from "../github/app.js";
import { prisma } from "../db.js";
import { checkAndIncrementSandboxQuota, recordSandboxSeconds, SandboxQuotaError } from "./quota.js";
import type {
  SandboxProvider,
  SandboxRunOptions,
  SandboxRunResult,
} from "./provider.js";

export class SandboxValidationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "SandboxValidationError";
  }
}

// Zod schema for the Lambda response payload
const TestStepSchema = z.object({
  name: z.string(),
  status: z.enum(["PASSED", "FAILED", "SKIPPED"]),
  durationMs: z.number(),
  note: z.string().optional(),
  outputTail: z.string().optional(),
  exitCode: z.number().optional(),
  baselineAlsoFails: z.boolean().optional(),
});

const LambdaResponseSchema = z.object({
  runId: z.string(),
  nodeVersion: z.string().optional(),
  npmVersion: z.string().optional(),
  steps: z.array(TestStepSchema),
  errorCode: z.string().optional(),
});

export class AwsLambdaProvider implements SandboxProvider {
  private readonly lambda: LambdaClient;
  private readonly s3: S3Client;
  private readonly functionName: string;
  private readonly bucket: string;

  constructor() {
    if (!env.AWS_REGION || !env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
      throw new Error("AWS credentials not configured");
    }
    if (!env.SANDBOX_LAMBDA_FUNCTION || !env.SANDBOX_BUCKET) {
      throw new Error("SANDBOX_LAMBDA_FUNCTION and SANDBOX_BUCKET must be set");
    }

    const credentials = {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    };

    this.lambda = new LambdaClient({
      region: env.AWS_REGION,
      credentials,
      maxAttempts: 1, // NO automatic retries — avoid double cost
      requestHandler: {
        requestTimeout: 310_000, // 310s client timeout (Lambda timeout is 300s)
        connectionTimeout: 10_000,
      } as any,
    });

    this.s3 = new S3Client({
      region: env.AWS_REGION,
      credentials,
      maxAttempts: 3,
    });

    this.functionName = env.SANDBOX_LAMBDA_FUNCTION;
    this.bucket = env.SANDBOX_BUCKET;
  }

  async run(options: SandboxRunOptions): Promise<SandboxRunResult> {
    const {
      validationId,
      owner,
      repo,
      sha,
      targetPath,
      original,
      patched,
      patchedSha256,
      limits,
    } = options;

    const startTime = Date.now();
    const s3Key = `validation/${validationId}.tar.gz`;
    let s3Uploaded = false;
    let workspaceId = "";

    // Resolve workspaceId for quota tracking
    const fv = await prisma.fixValidation.findUnique({
      where: { id: validationId },
      select: {
        workspaceId: true,
        fixProposal: {
          include: {
            finding: {
              include: {
                repository: {
                  include: { installation: true },
                },
              },
            },
          },
        },
      },
    });
    if (!fv) {
      throw new SandboxValidationError("INTERNAL", "Validation record not found");
    }
    workspaceId = fv.workspaceId;

    // 1. Quota check and atomic increment BEFORE any work
    try {
      await checkAndIncrementSandboxQuota(workspaceId);
    } catch (err) {
      if (err instanceof SandboxQuotaError) {
        throw new SandboxValidationError(err.code, err.message);
      }
      throw err;
    }

    try {
      // 2. Download repo archive from GitHub
      const installationId = fv.fixProposal?.finding?.repository?.installation?.installationId;
      if (!installationId) {
        throw new SandboxValidationError("INTERNAL", "GitHub installation not found");
      }

      const octokit = await githubApp.getInstallationOctokit(Number(installationId));
      const maxArchiveBytes = limits.maxArchiveBytes;
      let downloadedBytes = 0;
      const chunks: Buffer[] = [];

      try {
        const response = await octokit.request("GET /repos/{owner}/{repo}/tarball/{sha}", {
          owner,
          repo,
          sha,
          request: { parseSuccessResponseBody: false },
        });

        const rawStream = response.data as unknown as (ReadableStream<Uint8Array> | NodeJS.ReadableStream);
        const nodeStream =
          typeof (rawStream as NodeJS.ReadableStream).on === "function"
            ? (rawStream as NodeJS.ReadableStream)
            : Readable.fromWeb(rawStream as unknown as import("node:stream/web").ReadableStream);

        for await (const chunk of nodeStream) {
          const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          downloadedBytes += buf.length;
          if (downloadedBytes > maxArchiveBytes) {
            throw new SandboxValidationError("REPO_TOO_LARGE", "Repository archive exceeds size limit");
          }
          chunks.push(buf);
        }
      } catch (err: any) {
        if (err instanceof SandboxValidationError) throw err;
        throw new SandboxValidationError("DOWNLOAD_FAILED", "Failed to download repository archive");
      }

      const archiveBuffer = Buffer.concat(chunks);

      // 3. Upload to S3
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: s3Key,
          Body: archiveBuffer,
          ContentType: "application/gzip",
        })
      );
      s3Uploaded = true;

      // 4. Create presigned GET URL (never logged)
      const ttlSeconds = Math.min(env.SANDBOX_URL_TTL_SECONDS, 600);
      const getPresignedUrl = await getSignedUrl(
        this.s3,
        new GetObjectCommand({ Bucket: this.bucket, Key: s3Key }),
        { expiresIn: ttlSeconds }
      );

      // 5. Build Lambda payload (NO AWS keys, NO DB URLs)
      const runId = crypto.randomUUID();
      const payload = {
        runId,
        downloadUrl: getPresignedUrl, // presigned — no credentials in it
        targetPath,
        patchedContentBase64: Buffer.from(patched, "utf8").toString("base64"),
        originalContentBase64: Buffer.from(original, "utf8").toString("base64"),
        patchedSha256,
        limits: {
          maxArchiveBytes: limits.maxArchiveBytes,
          maxFiles: limits.maxFiles,
          maxTotalBytes: limits.maxTotalBytes,
        },
      };

      // Invoke Lambda (synchronous, maxAttempts 1, no retries)
      let invokeOutput: InvokeCommandOutput;
      try {
        invokeOutput = await this.lambda.send(
          new InvokeCommand({
            FunctionName: this.functionName,
            InvocationType: "RequestResponse",
            Payload: Buffer.from(JSON.stringify(payload)),
          })
        );
      } catch {
        throw new SandboxValidationError("LAMBDA_FAILED", "Lambda invocation failed");
      }

      // 6. Treat FunctionError as LAMBDA_FAILED
      if (invokeOutput.FunctionError) {
        throw new SandboxValidationError("LAMBDA_FAILED", "Lambda returned a function error");
      }

      // Parse and validate Lambda response
      let lambdaResult: z.infer<typeof LambdaResponseSchema>;
      try {
        const payloadBytes = invokeOutput.Payload;
        const payloadStr =
          payloadBytes instanceof Uint8Array
            ? Buffer.from(payloadBytes).toString("utf8")
            : "{}";
        const parsed = JSON.parse(payloadStr);
        lambdaResult = LambdaResponseSchema.parse(parsed);
      } catch {
        throw new SandboxValidationError("LAMBDA_FAILED", "Lambda returned malformed response");
      }

      return lambdaResult;
    } finally {
      // 7. ALWAYS delete S3 object (success or failure)
      if (s3Uploaded) {
        await this.s3
          .send(new DeleteObjectCommand({ Bucket: this.bucket, Key: s3Key }))
          .catch(() => {}); // best-effort, never throw
      }

      // 8. Record seconds in SandboxUsage
      if (workspaceId) {
        const elapsed = Math.max(1, Math.round((Date.now() - startTime) / 1000));
        await recordSandboxSeconds(workspaceId, elapsed);
      }
    }
  }
}
