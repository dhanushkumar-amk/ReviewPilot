-- CreateEnum
CREATE TYPE "FixValidationStatus" AS ENUM ('QUEUED', 'RUNNING', 'PASSED', 'PASSED_WITH_WARNINGS', 'FAILED', 'ERROR');

-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "sandboxEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sandboxEnabledAt" TIMESTAMP(3),
ADD COLUMN     "sandboxEnabledBy" TEXT;

-- CreateTable
CREATE TABLE "fix_validation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "fixProposalId" TEXT NOT NULL,
    "status" "FixValidationStatus" NOT NULL DEFAULT 'QUEUED',
    "steps" JSONB NOT NULL,
    "errorCode" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fix_validation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sandbox_usage" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "day" DATE NOT NULL,
    "runs" INTEGER NOT NULL DEFAULT 0,
    "seconds" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sandbox_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fix_validation_workspaceId_idx" ON "fix_validation"("workspaceId");

-- CreateIndex
CREATE INDEX "fix_validation_fixProposalId_idx" ON "fix_validation"("fixProposalId");

-- CreateIndex
CREATE INDEX "sandbox_usage_workspaceId_idx" ON "sandbox_usage"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "sandbox_usage_workspaceId_day_key" ON "sandbox_usage"("workspaceId", "day");

-- AddForeignKey
ALTER TABLE "fix_validation" ADD CONSTRAINT "fix_validation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fix_validation" ADD CONSTRAINT "fix_validation_fixProposalId_fkey" FOREIGN KEY ("fixProposalId") REFERENCES "fix_proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sandbox_usage" ADD CONSTRAINT "sandbox_usage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

