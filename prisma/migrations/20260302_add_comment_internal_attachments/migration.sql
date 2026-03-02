-- AlterTable
ALTER TABLE "comments" ADD COLUMN "attachments" JSONB,
ADD COLUMN "isInternal" BOOLEAN NOT NULL DEFAULT false;
