-- CreateEnum
CREATE TYPE "FindingSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO');

-- CreateEnum
CREATE TYPE "FindingCategory" AS ENUM ('SECURITY', 'BUG', 'PERFORMANCE', 'QUALITY', 'SECRET');

-- CreateEnum
CREATE TYPE "FindingTool" AS ENUM ('ESLINT', 'SEMGREP', 'GITLEAKS');

-- CreateEnum
CREATE TYPE "FindingStatus" AS ENUM ('OPEN', 'ACCEPTED', 'REJECTED', 'FIXED');

-- AlterTable
ALTER TABLE "scan" ADD COLUMN     "analyzers" JSONB,
ADD COLUMN     "durationMs" INTEGER,
ADD COLUMN     "filesScanned" INTEGER,
ADD COLUMN     "findingsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "phase" TEXT,
ADD COLUMN     "progress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "finding" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "firstScanId" TEXT NOT NULL,
    "lastScanId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "tool" "FindingTool" NOT NULL,
    "ruleId" TEXT NOT NULL,
    "severity" "FindingSeverity" NOT NULL,
    "category" "FindingCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "startLine" INTEGER NOT NULL,
    "endLine" INTEGER NOT NULL,
    "snippet" TEXT,
    "status" "FindingStatus" NOT NULL DEFAULT 'OPEN',
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "finding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "finding_workspaceId_idx" ON "finding"("workspaceId");

-- CreateIndex
CREATE INDEX "finding_repositoryId_idx" ON "finding"("repositoryId");

-- CreateIndex
CREATE INDEX "finding_workspaceId_status_severity_idx" ON "finding"("workspaceId", "status", "severity");

-- CreateIndex
CREATE INDEX "finding_repositoryId_status_idx" ON "finding"("repositoryId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "finding_repositoryId_fingerprint_key" ON "finding"("repositoryId", "fingerprint");

-- AddForeignKey
ALTER TABLE "finding" ADD CONSTRAINT "finding_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finding" ADD CONSTRAINT "finding_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
