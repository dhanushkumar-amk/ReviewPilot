/*
  Warnings:

  - Added the required column `installationId` to the `repository` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "GithubAccountType" AS ENUM ('User', 'Organization');

-- CreateEnum
CREATE TYPE "GithubRepositorySelection" AS ENUM ('ALL', 'SELECTED');

-- AlterEnum
CREATE TYPE "RepoStatus_new" AS ENUM ('AVAILABLE', 'CONNECTED', 'DISCONNECTED', 'REMOVED');
ALTER TABLE "repository" ALTER COLUMN "status" TYPE "RepoStatus_new" USING ("status"::text::"RepoStatus_new");
DROP TYPE "RepoStatus";
ALTER TYPE "RepoStatus_new" RENAME TO "RepoStatus";

-- AlterTable
ALTER TABLE "repository" ADD COLUMN     "installationId" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'AVAILABLE';

-- CreateTable
CREATE TABLE "github_installation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "installationId" BIGINT NOT NULL,
    "accountLogin" TEXT NOT NULL,
    "accountType" "GithubAccountType" NOT NULL,
    "accountId" BIGINT NOT NULL,
    "repositorySelection" "GithubRepositorySelection" NOT NULL,
    "htmlUrl" TEXT NOT NULL,
    "suspendedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "github_installation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "github_installation_installationId_key" ON "github_installation"("installationId");

-- CreateIndex
CREATE INDEX "github_installation_workspaceId_idx" ON "github_installation"("workspaceId");

-- CreateIndex
CREATE INDEX "repository_installationId_idx" ON "repository"("installationId");

-- AddForeignKey
ALTER TABLE "github_installation" ADD CONSTRAINT "github_installation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repository" ADD CONSTRAINT "repository_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "github_installation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
