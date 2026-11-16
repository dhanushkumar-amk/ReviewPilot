# reviewpilot-validator — Deploy Guide

This folder contains the Lambda container image source for the `reviewpilot-validator` function.
Build and push from **AWS CloudShell** (no credentials needed on your laptop).

---

## Prerequisites (already done)

- Private ECR repository: `reviewpilot-validator` in `ap-south-1`
- Lambda function `reviewpilot-validator`: x86_64, 1024 MB memory, 2048 MB ephemeral storage, 300 s timeout, **empty environment variables**, logging-only execution role, no VPC

---

## Step 1 — Package the source on your laptop

Zip the `validator/` folder **without** `node_modules` (there are none):

```powershell
# From the repo root
Compress-Archive -Path validator\* -DestinationPath validator.zip
```

---

## Step 2 — Upload to CloudShell

1. Open the [AWS CloudShell console](https://console.aws.amazon.com/cloudshell/) in `ap-south-1`.
2. Click **Actions → Upload file** and select `validator.zip`.
3. Unzip it:

```bash
mkdir -p ~/validator-build
unzip ~/validator.zip -d ~/validator-build
```

---

## Step 3 — Build the Docker image

```bash
cd ~/validator-build

# Build for linux/amd64 (Lambda requires this)
# If Lambda reports "unsupported manifest type", add --provenance=false
docker build --platform linux/amd64 -t reviewpilot-validator .
# Or if the manifest error appears:
# docker build --platform linux/amd64 --provenance=false -t reviewpilot-validator .
```

---

## Step 4 — Log in to ECR and push

Replace `<ACCOUNT_ID>` with your AWS account ID (12 digits):

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=ap-south-1
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/reviewpilot-validator"

# Authenticate Docker to ECR
aws ecr get-login-password --region ${REGION} | \
  docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

# Tag and push
docker tag reviewpilot-validator:latest ${ECR_URI}:latest
docker push ${ECR_URI}:latest
```

---

## Step 5 — Deploy new image to Lambda

1. Open the [Lambda console](https://console.aws.amazon.com/lambda/) → `reviewpilot-validator`.
2. In the **Code** tab, click **Deploy new image**.
3. Click **Browse images** → select your ECR repository → choose the `latest` image → **Save**.
4. Wait for the update to complete (the status turns green).

---

## Step 6 — Verify settings (do not change these)

| Setting | Value |
|---|---|
| Memory | 1024 MB |
| Ephemeral storage | 2048 MB |
| Timeout | 300 seconds |
| Environment variables | **(empty — do not add any)** |
| Execution role | Logging only (CloudWatch Logs) |
| VPC | None |
| Architecture | x86_64 |

> [!IMPORTANT]
> **Never add AWS credentials or any secrets to Lambda environment variables.**
> The function intentionally has no environment variables. Presigned S3 URLs are
> passed through the event payload and expire in ≤ 600 seconds.

---

## Step 7 — Smoke test

After deploying, run the smoke test from your backend:

```powershell
cd backend
npm run validator:smoke
```

Expected output (versions may differ):

```
Node version: v22.x.x
npm version:  10.x.x
install      PASSED   12345 ms
lint         SKIPPED  (No lint script in package.json)
typecheck    SKIPPED  (No typecheck script or tsconfig.json found)
test         PASSED   456 ms
```

If you see `LAMBDA_FAILED` or a timeout, check **CloudWatch Logs** for
`/aws/lambda/reviewpilot-validator`. The logs contain only step names, durations,
and outcome codes — never presigned URLs or file contents.

---

## Security notes

- Repository scripts execute **only inside this Lambda container**, never on the backend.
- Child processes receive a **scrubbed environment**: only `PATH`, `HOME`, `TMPDIR`,
  `CI=true`, and npm config flags. No `AWS_*` or `LAMBDA_*` variables are inherited.
- The Lambda has no VPC, so repository scripts can reach the internet. This is accepted
  because the code belongs to the user who connected the repository, and the sandbox
  holds no secrets.
- The function role grants only CloudWatch Logs writes. Lambda's temporary AWS credentials
  cannot access S3, ECR, or any other service.
- Test results are **advisory**. A human always approves a fix before any PR is created.
- Archives are always deleted from S3 after the Lambda returns (whether it succeeds or fails).
