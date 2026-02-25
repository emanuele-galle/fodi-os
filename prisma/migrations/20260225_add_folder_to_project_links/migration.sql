-- AlterTable (column may already exist from partial previous attempt)
ALTER TABLE "project_links" ADD COLUMN IF NOT EXISTS "folderId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "project_links_folderId_idx" ON "project_links"("folderId");

-- AddForeignKey
ALTER TABLE "project_links" ADD CONSTRAINT "project_links_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
