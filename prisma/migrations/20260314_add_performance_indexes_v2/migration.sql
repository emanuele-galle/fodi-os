-- Performance indexes batch 2

-- BankAccount: filter by isActive for dropdown queries
CREATE INDEX IF NOT EXISTS "bank_accounts_isActive_idx" ON "bank_accounts" ("isActive");

-- BusinessEntity: filter by isActive for dropdown queries
CREATE INDEX IF NOT EXISTS "business_entities_isActive_idx" ON "business_entities" ("isActive");

-- ChatMessage: replace [channelId, createdAt] with [channelId, deletedAt, createdAt] for filtered message listing
DROP INDEX IF EXISTS "chat_messages_channelId_createdAt_idx";
CREATE INDEX "chat_messages_channelId_deletedAt_createdAt_idx" ON "chat_messages" ("channelId", "deletedAt", "createdAt");

-- AiConversation: replace [userId] with [userId, isArchived] for filtered conversation listing
DROP INDEX IF EXISTS "ai_conversations_userId_idx";
CREATE INDEX "ai_conversations_userId_isArchived_idx" ON "ai_conversations" ("userId", "isArchived");

-- WizardSubmission: add index on submitterId for user-based lookups
CREATE INDEX IF NOT EXISTS "wizard_submissions_submitterId_idx" ON "wizard_submissions" ("submitterId");

-- ActivityLog: replace [entityType, entityId] with [entityType, entityId, createdAt DESC] (from previous commit)
-- Already applied via schema change in previous migration
