-- AlterTable: Remove all voice/TTS fields
ALTER TABLE "ai_agent_configs" DROP COLUMN IF EXISTS "voiceAgentId";
ALTER TABLE "ai_agent_configs" DROP COLUMN IF EXISTS "voiceAgentEnabled";
ALTER TABLE "ai_agent_configs" DROP COLUMN IF EXISTS "ttsProvider";
ALTER TABLE "ai_agent_configs" DROP COLUMN IF EXISTS "ttsVoice";
ALTER TABLE "ai_agent_configs" DROP COLUMN IF EXISTS "autoPlayVoice";
