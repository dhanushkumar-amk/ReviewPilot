-- CreateEnum
CREATE TYPE "FixProposalStatus" AS ENUM ('DRAFT', 'DISCARDED', 'INVALID');

-- CreateEnum
CREATE TYPE "FixProposalConfidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "aiEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aiEnabledAt" TIMESTAMP(3),
ADD COLUMN     "aiEnabledBy" TEXT;

-- CreateTable
CREATE TABLE "finding_insight" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "whyItMatters" TEXT NOT NULL,
    "howToFix" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "redacted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finding_insight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fix_proposal" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "status" "FixProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "filePath" TEXT NOT NULL,
    "startLine" INTEGER NOT NULL,
    "endLine" INTEGER NOT NULL,
    "originalCode" TEXT NOT NULL,
    "replacementCode" TEXT NOT NULL,
    "diff" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "confidence" "FixProposalConfidence" NOT NULL,
    "checks" JSONB NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fix_proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "day" DATE NOT NULL,
    "calls" INTEGER NOT NULL DEFAULT 0,
    "tokensIn" INTEGER NOT NULL DEFAULT 0,
    "tokensOut" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "finding_insight_workspaceId_idx" ON "finding_insight"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "finding_insight_findingId_promptVersion_key" ON "finding_insight"("findingId", "promptVersion");

-- CreateIndex
CREATE INDEX "fix_proposal_workspaceId_idx" ON "fix_proposal"("workspaceId");

-- CreateIndex
CREATE INDEX "fix_proposal_findingId_idx" ON "fix_proposal"("findingId");

-- CreateIndex
CREATE INDEX "ai_usage_workspaceId_idx" ON "ai_usage"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_usage_workspaceId_day_key" ON "ai_usage"("workspaceId", "day");

-- AddForeignKey
ALTER TABLE "finding_insight" ADD CONSTRAINT "finding_insight_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finding_insight" ADD CONSTRAINT "finding_insight_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "finding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fix_proposal" ADD CONSTRAINT "fix_proposal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fix_proposal" ADD CONSTRAINT "fix_proposal_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "finding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
