-- AlterTable
ALTER TABLE "github_installation" ADD COLUMN IF NOT EXISTS "permissions" JSONB;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "PullRequestStatus" AS ENUM ('CREATING', 'OPEN', 'MERGED', 'CLOSED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "pull_request" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "fixProposalId" TEXT NOT NULL,
    "validationId" TEXT,
    "githubNumber" INTEGER,
    "htmlUrl" TEXT,
    "branchName" TEXT NOT NULL,
    "baseBranch" TEXT NOT NULL,
    "headSha" TEXT,
    "title" TEXT NOT NULL,
    "status" "PullRequestStatus" NOT NULL DEFAULT 'CREATING',
    "errorCode" TEXT,
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "testsRun" BOOLEAN NOT NULL DEFAULT false,
    "mergedAt" TIMESTAMP(3),
    "mergedByUserId" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "pull_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "audit_log" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "pull_request_fixProposalId_key" ON "pull_request"("fixProposalId");
CREATE UNIQUE INDEX IF NOT EXISTS "pull_request_repositoryId_githubNumber_key" ON "pull_request"("repositoryId", "githubNumber");
CREATE INDEX IF NOT EXISTS "pull_request_workspaceId_idx" ON "pull_request"("workspaceId");
CREATE INDEX IF NOT EXISTS "pull_request_repositoryId_idx" ON "pull_request"("repositoryId");
CREATE INDEX IF NOT EXISTS "pull_request_findingId_idx" ON "pull_request"("findingId");
CREATE INDEX IF NOT EXISTS "pull_request_workspaceId_createdAt_idx" ON "pull_request"("workspaceId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "audit_log_workspaceId_idx" ON "audit_log"("workspaceId");
CREATE INDEX IF NOT EXISTS "audit_log_workspaceId_createdAt_idx" ON "audit_log"("workspaceId", "createdAt" DESC);

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "pull_request" ADD CONSTRAINT "pull_request_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "pull_request" ADD CONSTRAINT "pull_request_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "pull_request" ADD CONSTRAINT "pull_request_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "finding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "pull_request" ADD CONSTRAINT "pull_request_fixProposalId_fkey" FOREIGN KEY ("fixProposalId") REFERENCES "fix_proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
