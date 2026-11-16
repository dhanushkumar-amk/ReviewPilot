-- AlterTable
ALTER TABLE "fix_validation" DROP COLUMN IF EXISTS "steps",
ADD COLUMN "riskLevel" TEXT,
ADD COLUMN "staticChecks" JSONB,
ADD COLUMN "testsRequested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "testsRun" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "testSteps" JSONB,
ADD COLUMN "nodeVersion" TEXT;

-- CreateIndex
CREATE INDEX "fix_validation_fixProposalId_createdAt_idx" ON "fix_validation"("fixProposalId", "createdAt" DESC);
