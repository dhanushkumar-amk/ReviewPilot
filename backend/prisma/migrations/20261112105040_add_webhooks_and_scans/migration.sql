-- CreateEnum
CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED');

-- CreateEnum
CREATE TYPE "ScanTrigger" AS ENUM ('PUSH', 'MANUAL');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "repository" ADD COLUMN     "lastPushAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "webhook_delivery" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "action" TEXT,
    "installationId" BIGINT,
    "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'RECEIVED',
    "ignoreReason" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "webhook_delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "commitSha" TEXT NOT NULL,
    "trigger" "ScanTrigger" NOT NULL,
    "status" "ScanStatus" NOT NULL DEFAULT 'QUEUED',
    "errorCode" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "webhook_delivery_deliveryId_key" ON "webhook_delivery"("deliveryId");

-- CreateIndex
CREATE INDEX "webhook_delivery_receivedAt_idx" ON "webhook_delivery"("receivedAt");

-- CreateIndex
CREATE INDEX "scan_workspaceId_idx" ON "scan"("workspaceId");

-- CreateIndex
CREATE INDEX "scan_repositoryId_idx" ON "scan"("repositoryId");

-- CreateIndex
CREATE INDEX "scan_workspaceId_createdAt_idx" ON "scan"("workspaceId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "scan_repositoryId_commitSha_key" ON "scan"("repositoryId", "commitSha");

-- AddForeignKey
ALTER TABLE "scan" ADD CONSTRAINT "scan_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan" ADD CONSTRAINT "scan_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
