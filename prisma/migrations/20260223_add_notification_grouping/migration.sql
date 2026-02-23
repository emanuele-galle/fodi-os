-- AlterTable
ALTER TABLE "notifications"
  ADD COLUMN "groupKey" TEXT,
  ADD COLUMN "groupCount" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "lastActorName" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "notifications_userId_groupKey_idx" ON "notifications"("userId", "groupKey");
