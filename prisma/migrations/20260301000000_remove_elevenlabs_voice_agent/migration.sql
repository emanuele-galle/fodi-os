-- AlterTable: Remove ElevenLabs voice agent fields
ALTER TABLE "ai_agent_configs" DROP COLUMN IF EXISTS "voiceAgentId";
ALTER TABLE "ai_agent_configs" DROP COLUMN IF EXISTS "voiceAgentEnabled";
