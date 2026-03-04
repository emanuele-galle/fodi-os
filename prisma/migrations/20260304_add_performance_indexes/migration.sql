-- B-tree indexes for foreign keys and common queries
CREATE INDEX IF NOT EXISTS "task_dependencies_dependsOnId_idx" ON "task_dependencies"("dependsOnId");

CREATE INDEX IF NOT EXISTS "wiki_pages_parentId_idx" ON "wiki_pages"("parentId");
CREATE INDEX IF NOT EXISTS "wiki_pages_isPublished_idx" ON "wiki_pages"("isPublished");

CREATE INDEX IF NOT EXISTS "wizard_submissions_templateId_status_idx" ON "wizard_submissions"("templateId", "status");

CREATE INDEX IF NOT EXISTS "login_otps_expiresAt_idx" ON "login_otps"("expiresAt");

CREATE INDEX IF NOT EXISTS "signature_otps_expiresAt_idx" ON "signature_otps"("expiresAt");

CREATE INDEX IF NOT EXISTS "recurring_invoices_bankAccountId_idx" ON "recurring_invoices"("bankAccountId");
CREATE INDEX IF NOT EXISTS "recurring_invoices_businessEntityId_idx" ON "recurring_invoices"("businessEntityId");

CREATE INDEX IF NOT EXISTS "incomes_clientId_idx" ON "incomes"("clientId");
CREATE INDEX IF NOT EXISTS "incomes_businessEntityId_idx" ON "incomes"("businessEntityId");

CREATE INDEX IF NOT EXISTS "bank_transfers_fromAccountId_idx" ON "bank_transfers"("fromAccountId");
CREATE INDEX IF NOT EXISTS "bank_transfers_toAccountId_idx" ON "bank_transfers"("toAccountId");

-- GIN indexes for array (tags) columns
CREATE INDEX IF NOT EXISTS "tasks_tags_gin" ON "tasks" USING gin("tags");
CREATE INDEX IF NOT EXISTS "clients_tags_gin" ON "clients" USING gin("tags");
