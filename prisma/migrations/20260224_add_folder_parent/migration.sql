-- AlterTable
ALTER TABLE "folders" ADD COLUMN "parentId" TEXT;

-- CreateIndex
CREATE INDEX "folders_parentId_idx" ON "folders"("parentId");

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
