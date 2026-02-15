-- =============================================================
-- SEED: Video Tutorial Training Courses
-- Aggiunge categoria "Video Tutorial" + 10 corsi video FODI OS
-- + popola corsi vuoti esistenti con lezioni base
-- =============================================================

BEGIN;

-- 1. Crea categoria "Video Tutorial" (type USER)
INSERT INTO training_categories (id, name, slug, description, icon, type, "sortOrder", "isActive", "createdAt", "updatedAt")
VALUES ('cat-user-video', 'Video Tutorial', 'video-tutorial', 'Video tutorial interattivi per imparare a usare FODI OS', '🎬', 'USER', 1, true, NOW(), NOW())
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, icon = EXCLUDED.icon, "updatedAt" = NOW();

-- 2. Crea 10 corsi video

-- Corso 1: Panoramica FODI OS
INSERT INTO training_courses (id, "categoryId", title, slug, description, difficulty, "estimatedMins", "isPublished", "sortOrder", "createdAt", "updatedAt")
VALUES ('course-v01', 'cat-user-video', 'Panoramica FODI OS', 'panoramica-fodi-os', 'Scopri tutte le funzionalita di FODI OS in un video panoramico: dashboard, moduli, navigazione e personalizzazione.', 'BEGINNER', 1, true, 1, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;
INSERT INTO training_lessons (id, "courseId", title, slug, "contentType", "videoUrl", "videoDurationSecs", "sortOrder", "isPublished", "createdAt", "updatedAt")
VALUES ('lesson-v01-01', 'course-v01', 'Video: Panoramica Generale', 'video-panoramica', 'VIDEO', '/training/01-overview.mp4', 35, 1, true, NOW(), NOW())
ON CONFLICT ("courseId", slug) DO NOTHING;

-- Corso 2: CRM & Pipeline
INSERT INTO training_courses (id, "categoryId", title, slug, description, difficulty, "estimatedMins", "isPublished", "sortOrder", "createdAt", "updatedAt")
VALUES ('course-v02', 'cat-user-video', 'CRM & Pipeline', 'crm-pipeline-video', 'Impara a gestire clienti, contatti, pipeline vendite e interazioni dal modulo CRM.', 'BEGINNER', 1, true, 2, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;
INSERT INTO training_lessons (id, "courseId", title, slug, "contentType", "videoUrl", "videoDurationSecs", "sortOrder", "isPublished", "createdAt", "updatedAt")
VALUES ('lesson-v02-01', 'course-v02', 'Video: CRM & Pipeline', 'video-crm', 'VIDEO', '/training/02-crm.mp4', 35, 1, true, NOW(), NOW())
ON CONFLICT ("courseId", slug) DO NOTHING;

-- Corso 3: Gestione Progetti
INSERT INTO training_courses (id, "categoryId", title, slug, description, difficulty, "estimatedMins", "isPublished", "sortOrder", "createdAt", "updatedAt")
VALUES ('course-v03', 'cat-user-video', 'Gestione Progetti', 'gestione-progetti-video', 'Organizza progetti, task, milestone e time tracking con il project manager integrato.', 'BEGINNER', 1, true, 3, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;
INSERT INTO training_lessons (id, "courseId", title, slug, "contentType", "videoUrl", "videoDurationSecs", "sortOrder", "isPublished", "createdAt", "updatedAt")
VALUES ('lesson-v03-01', 'course-v03', 'Video: Project Management', 'video-projects', 'VIDEO', '/training/03-projects.mp4', 35, 1, true, NOW(), NOW())
ON CONFLICT ("courseId", slug) DO NOTHING;

-- Corso 4: ERP Finanziario
INSERT INTO training_courses (id, "categoryId", title, slug, description, difficulty, "estimatedMins", "isPublished", "sortOrder", "createdAt", "updatedAt")
VALUES ('course-v04', 'cat-user-video', 'ERP Finanziario', 'erp-finanziario', 'Gestisci preventivi, fatture, spese e report finanziari con il modulo ERP.', 'INTERMEDIATE', 1, true, 4, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;
INSERT INTO training_lessons (id, "courseId", title, slug, "contentType", "videoUrl", "videoDurationSecs", "sortOrder", "isPublished", "createdAt", "updatedAt")
VALUES ('lesson-v04-01', 'course-v04', 'Video: ERP Finanziario', 'video-erp', 'VIDEO', '/training/04-erp.mp4', 35, 1, true, NOW(), NOW())
ON CONFLICT ("courseId", slug) DO NOTHING;

-- Corso 5: Knowledge Base
INSERT INTO training_courses (id, "categoryId", title, slug, description, difficulty, "estimatedMins", "isPublished", "sortOrder", "createdAt", "updatedAt")
VALUES ('course-v05', 'cat-user-video', 'Knowledge Base', 'knowledge-base-video', 'Usa la wiki collaborativa per documentare procedure, guide e knowledge del team.', 'BEGINNER', 1, true, 5, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;
INSERT INTO training_lessons (id, "courseId", title, slug, "contentType", "videoUrl", "videoDurationSecs", "sortOrder", "isPublished", "createdAt", "updatedAt")
VALUES ('lesson-v05-01', 'course-v05', 'Video: Knowledge Base', 'video-kb', 'VIDEO', '/training/05-kb.mp4', 30, 1, true, NOW(), NOW())
ON CONFLICT ("courseId", slug) DO NOTHING;

-- Corso 6: Chat Team
INSERT INTO training_courses (id, "categoryId", title, slug, description, difficulty, "estimatedMins", "isPublished", "sortOrder", "createdAt", "updatedAt")
VALUES ('course-v06', 'cat-user-video', 'Chat Team', 'chat-team-video', 'Comunica con il team in tempo reale: canali, messaggi diretti, reazioni e notifiche.', 'BEGINNER', 1, true, 6, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;
INSERT INTO training_lessons (id, "courseId", title, slug, "contentType", "videoUrl", "videoDurationSecs", "sortOrder", "isPublished", "createdAt", "updatedAt")
VALUES ('lesson-v06-01', 'course-v06', 'Video: Chat Team', 'video-chat', 'VIDEO', '/training/06-chat.mp4', 35, 1, true, NOW(), NOW())
ON CONFLICT ("courseId", slug) DO NOTHING;

-- Corso 7: Asset & Contenuti
INSERT INTO training_courses (id, "categoryId", title, slug, description, difficulty, "estimatedMins", "isPublished", "sortOrder", "createdAt", "updatedAt")
VALUES ('course-v07', 'cat-user-video', 'Asset & Contenuti', 'asset-contenuti', 'Gestisci file, immagini, documenti e il workflow di review dei contenuti.', 'BEGINNER', 1, true, 7, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;
INSERT INTO training_lessons (id, "courseId", title, slug, "contentType", "videoUrl", "videoDurationSecs", "sortOrder", "isPublished", "createdAt", "updatedAt")
VALUES ('lesson-v07-01', 'course-v07', 'Video: Asset & Contenuti', 'video-assets', 'VIDEO', '/training/07-assets.mp4', 30, 1, true, NOW(), NOW())
ON CONFLICT ("courseId", slug) DO NOTHING;

-- Corso 8: Supporto & Ticket
INSERT INTO training_courses (id, "categoryId", title, slug, description, difficulty, "estimatedMins", "isPublished", "sortOrder", "createdAt", "updatedAt")
VALUES ('course-v08', 'cat-user-video', 'Supporto & Ticket', 'supporto-ticket', 'Crea e gestisci ticket di supporto con priorita, assegnazioni e SLA.', 'BEGINNER', 1, true, 8, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;
INSERT INTO training_lessons (id, "courseId", title, slug, "contentType", "videoUrl", "videoDurationSecs", "sortOrder", "isPublished", "createdAt", "updatedAt")
VALUES ('lesson-v08-01', 'course-v08', 'Video: Supporto & Ticket', 'video-support', 'VIDEO', '/training/08-support.mp4', 30, 1, true, NOW(), NOW())
ON CONFLICT ("courseId", slug) DO NOTHING;

-- Corso 9: Mobile & PWA
INSERT INTO training_courses (id, "categoryId", title, slug, description, difficulty, "estimatedMins", "isPublished", "sortOrder", "createdAt", "updatedAt")
VALUES ('course-v09', 'cat-user-video', 'Mobile & PWA', 'mobile-pwa', 'Accedi a FODI OS da mobile con il design responsive e le funzionalita PWA.', 'BEGINNER', 1, true, 9, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;
INSERT INTO training_lessons (id, "courseId", title, slug, "contentType", "videoUrl", "videoDurationSecs", "sortOrder", "isPublished", "createdAt", "updatedAt")
VALUES ('lesson-v09-01', 'course-v09', 'Video: Mobile & PWA', 'video-mobile', 'VIDEO', '/training/09-mobile.mp4', 25, 1, true, NOW(), NOW())
ON CONFLICT ("courseId", slug) DO NOTHING;

-- Corso 10: Admin & Configurazione
INSERT INTO training_courses (id, "categoryId", title, slug, description, difficulty, "estimatedMins", "isPublished", "sortOrder", "createdAt", "updatedAt")
VALUES ('course-v10', 'cat-user-video', 'Admin & Configurazione', 'admin-configurazione', 'Gestisci utenti, ruoli, permessi e impostazioni di sistema come amministratore.', 'INTERMEDIATE', 1, true, 10, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;
INSERT INTO training_lessons (id, "courseId", title, slug, "contentType", "videoUrl", "videoDurationSecs", "sortOrder", "isPublished", "createdAt", "updatedAt")
VALUES ('lesson-v10-01', 'course-v10', 'Video: Admin & Configurazione', 'video-admin', 'VIDEO', '/training/10-admin.mp4', 30, 1, true, NOW(), NOW())
ON CONFLICT ("courseId", slug) DO NOTHING;

-- 3. Popola corsi vuoti esistenti con lezione base

-- course-02: Next.js 16 + Prisma 7 (0 lezioni)
INSERT INTO training_lessons (id, "courseId", title, slug, content, "contentType", "sortOrder", "isPublished", "createdAt", "updatedAt")
VALUES ('lesson-02-01', 'course-02', 'Introduzione a Next.js 16 con Prisma', 'intro-nextjs-prisma',
  '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Next.js 16 + Prisma 7"}]},{"type":"paragraph","content":[{"type":"text","text":"Questo corso copre le basi di Next.js 16 con il nuovo App Router e l''integrazione con Prisma 7 per la gestione del database."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Argomenti"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"App Router e Server Components"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Prisma Schema e Migrazioni"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"API Routes con validazione"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Deploy con Docker"}]}]}]}]}',
  'TEXT', 1, true, NOW(), NOW())
ON CONFLICT ("courseId", slug) DO NOTHING;

-- course-04: Gestione Progetti e Task (0 lezioni)
INSERT INTO training_lessons (id, "courseId", title, slug, content, "contentType", "sortOrder", "isPublished", "createdAt", "updatedAt")
VALUES ('lesson-04-01', 'course-04', 'Come gestire progetti e task', 'intro-gestione-progetti',
  '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Gestione Progetti e Task"}]},{"type":"paragraph","content":[{"type":"text","text":"Impara a creare e organizzare progetti, task, milestone e a tracciare il tempo lavorato."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Workflow base"}]},{"type":"orderedList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Crea un nuovo progetto dal menu Projects"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Aggiungi task con titolo, descrizione e assegnatario"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Usa la board Kanban per spostare i task tra gli stati"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Traccia il tempo con il timer integrato"}]}]}]}]}',
  'TEXT', 1, true, NOW(), NOW())
ON CONFLICT ("courseId", slug) DO NOTHING;

COMMIT;
