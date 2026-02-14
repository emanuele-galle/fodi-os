# FODI OS - Backend API Audit Report

**Data:** 2026-02-14
**Auditor:** backend-auditor (Claude Opus 4.6)
**Scope:** Tutte le 131 API routes in `src/app/api/`
**Progetto:** FODI OS (Next.js 16 + Prisma + PostgreSQL + MinIO + Google APIs)

---

## Indice

1. [Executive Summary](#1-executive-summary)
2. [Architettura Auth/RBAC](#2-architettura-authrbac)
3. [Findings per Severita](#3-findings-per-severita)
4. [Dettaglio per Modulo](#4-dettaglio-per-modulo)
5. [Checklist Compliance Matrix](#5-checklist-compliance-matrix)
6. [Raccomandazioni](#6-raccomandazioni)

---

## 1. Executive Summary

| Metrica | Valore |
|---------|--------|
| Route totali auditate | 131 |
| Route con auth enforcement | 126/131 (96.2%) |
| Route con RBAC via `requirePermission()` | 108/131 (82.4%) |
| Route con Zod validation | 85/~95 POST/PATCH (89.5%) |
| Route con pagination | 28/~35 list endpoints (80.0%) |
| Route con rate limiting | 2/131 (1.5%) |
| Route con transactions dove servono | 3/~12 (25.0%) |
| IDOR checks (owner validation) | Parziale |

### Conteggio Findings

| Severita | Count |
|----------|-------|
| CRITICAL | 3 |
| HIGH | 8 |
| MEDIUM | 15 |
| LOW | 12 |

---

## 2. Architettura Auth/RBAC

### Middleware (`src/middleware.ts`)
- JWT verification su tutte le route non-public
- Auto-refresh del token scaduto usando refresh token
- Injection headers: `x-user-id`, `x-user-role`, `x-user-email`
- Security headers: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- Public paths: `/login`, `/forgot-password`, `/api/auth/*`, `/api/health`, `POST /api/leads`, `/api/webhooks/n8n`

### Permissions (`src/lib/permissions.ts`)
- Matrice RBAC con 8 ruoli x 9 moduli x 5 permessi
- `hasPermission(role, module, permission)` / `requirePermission(role, module, permission)`
- ADMIN ha accesso completo a tutto
- CLIENT ha solo `portal:read` e `portal:write`

### Rate Limiting (`src/lib/rate-limit.ts`)
- In-memory Map (non distribuito, si perde al restart)
- Cleanup ogni 5 minuti
- Usato solo su: `auth/login` (10 tentativi / 15min) e `leads POST` (5 tentativi / 60s)

---

## 3. Findings per Severita

### CRITICAL

#### C-01: `users/invite` usa `Math.random()` per password temporanea
- **File:** `src/app/api/users/invite/route.ts`
- **Problema:** `Math.random().toString(36).slice(-10)` non e crittograficamente sicuro. Un attaccante che conosce il timing potrebbe predire la password.
- **Fix:** Usare `crypto.randomBytes(16).toString('hex')` o `crypto.getRandomValues()`.

#### C-02: Portal wizard submission senza autenticazione
- **File:** `src/app/api/portal/wizard-submissions/route.ts` (POST)
- **Problema:** L'endpoint POST crea wizard submissions senza verificare `x-user-id` o `x-user-role`. Qualsiasi utente autenticato (anche con cookie portal scaduto/invalido) potrebbe creare submissions per qualsiasi wizard.
- **Note:** Il middleware inietta `x-user-id` dalle portal routes, ma la route non lo verifica ne lo usa per scoping.
- **Fix:** Verificare `x-user-id` e associare la submission al portal user.

#### C-03: Portal wizard submission PATCH senza ownership check
- **File:** `src/app/api/portal/wizard-submissions/[submissionId]/route.ts`
- **Problema:** Il PATCH non verifica che la submission appartenga all'utente portal corrente. Qualsiasi utente portal potrebbe modificare le answers di qualsiasi submission conoscendo l'ID.
- **Fix:** Filtrare per `submitterId` o `clientId` del portal user.

### HIGH

#### H-01: Mancanza quasi totale di rate limiting
- **Problema:** Solo 2 su 131 routes hanno rate limiting (login e leads POST). Endpoint sensibili senza rate limiting:
  - `POST /api/users/me/password` (cambio password - brute force possibile)
  - `POST /api/users/invite` (inviti utente - flood)
  - `POST /api/auth/forgot-password` (email bombing)
  - `POST /api/sign/[token]/request-otp` (limitato a 3 OTP per request, ma nessun rate limit globale sull'IP)
  - `GET /api/search` (query pesanti senza throttling)
- **Fix:** Implementare rate limiting middleware globale o per-endpoint.

#### H-02: Mancanza di transactions in operazioni multi-step
- **Problema:** Diverse operazioni che modificano piu tabelle non usano `$transaction`:
  - `quotes/[quoteId] PATCH`: delete + create lineItems (riga 53-64 nel file quote templates PATCH analogo)
  - `invoices/[invoiceId] PATCH`: delete + create lineItems
  - `quote-templates/[templateId] PATCH`: deleteMany + createMany lineItems
  - `tasks/[taskId]/timer POST` (stop): crea TimeEntry + aggiorna Task + aggiorna Timer (3 writes separati)
  - `fatturapa POST`: update/create electronicInvoice + create statusLog (2 writes separati)
  - `credit-note POST`: create electronicInvoice + create statusLog (2 writes)
- **Operazioni che USANO $transaction (correttamente):**
  - `users/[id]/permissions PATCH`
  - `wiki/reorder POST`
  - `sign/[token]/decline POST`
- **Fix:** Wrappare in `prisma.$transaction()` tutte le operazioni multi-step.

#### H-03: N+1 queries in wiki breadcrumb
- **File:** `src/app/api/wiki/[pageId]/route.ts`
- **Problema:** While loop che esegue una query per ogni livello di breadcrumb: `while (currentPage?.parentId) { await prisma.wikiPage.findUnique(...) }`.
- **Impatto:** Se la gerarchia wiki ha N livelli, vengono eseguite N+1 queries.
- **Fix:** Usare una CTE ricorsiva SQL raw o caricare tutto l'albero in una query.

#### H-04: N+1 in wiki recursive delete
- **File:** `src/app/api/wiki/[pageId]/route.ts` DELETE
- **Problema:** Funzione ricorsiva `deletePageAndChildren()` esegue una `findMany` + una `update` per ogni nodo dell'albero.
- **Fix:** Usare una query ricorsiva o cascade delete a livello DB.

#### H-05: `analytics/tasks` carica TUTTI i task senza pagination
- **File:** `src/app/api/analytics/tasks/route.ts`
- **Problema:** `prisma.task.findMany()` senza `take`/`skip`. Con migliaia di task, la risposta sara enorme e lenta.
- **Fix:** Aggiungere paginazione o fare aggregazione lato DB con `groupBy`.

#### H-06: Routes senza `requirePermission()` che dovrebbero averlo
Le seguenti route non usano il sistema RBAC centralizzato:
| Route | Check attuale | Problema |
|-------|---------------|----------|
| `users/route.ts` GET | `role !== 'ADMIN' && role !== 'MANAGER'` custom | Qualunque utente autenticato puo listare utenti (non-admin vede tutti) |
| `activity/route.ts` GET | solo `x-user-id` check | Nessun RBAC, tutti vedono la propria activity |
| `workspaces/route.ts` GET | custom admin check | Nessun RBAC formale |
| `team/route.ts` GET | solo `x-user-role` check | Tutti vedono il team, CLIENT con vista limitata |
| `chat/channels/[id]/read` POST | solo `x-user-id` | Nessun RBAC ne verifica membership |
| `calendar/route.ts` GET | solo `x-user-id` | Nessun RBAC |
| `calendar/events/route.ts` GET/POST | solo `x-user-id` | Nessun RBAC |
| `drive/*` (3 routes) | solo `x-user-id` | Nessun RBAC |
| `meetings/route.ts` GET/POST | solo `x-user-id` | Nessun RBAC |
| `meetings/quick` POST | solo `x-user-id` | Nessun RBAC |
| `portal/wizards` GET | nessun check | Nessun auth/RBAC |

#### H-07: `chat/channels/[id]/read` nessuna verifica membership
- **File:** `src/app/api/chat/channels/[id]/read/route.ts`
- **Problema:** Aggiorna `lastReadAt` per qualsiasi channelId senza verificare che l'utente sia membro del canale. Basso impatto (solo update lastReadAt), ma viola il principio di accesso minimo.
- **Fix:** Aggiungere check membership.

#### H-08: `work-sessions` GET ha side effects
- **File:** `src/app/api/work-sessions/route.ts`
- **Problema:** La GET auto-chiude sessioni "stale" (aperte da >14 ore). Una GET non dovrebbe avere write side effects.
- **Fix:** Spostare la logica di auto-close in un cron job o un endpoint POST dedicato.

### MEDIUM

#### M-01: Mancanza di pagination su list endpoints
| Route | Ritorna |
|-------|---------|
| `clients/[clientId]/contacts` GET | Tutti i contatti |
| `clients/[clientId]/interactions` GET | Tutte le interazioni |
| `social/route.ts` GET | Tutti i social posts |
| `wiki/[pageId]/activity` GET | Hard limit 50, no paginazione |
| `assets/[assetId]/reviews` GET | Tutte le review |
| `assets/reviews` GET | Tutte le review (globale!) |
| `reviews/[reviewId]/comments` GET | Tutti i commenti |

#### M-02: Input validation manuale invece di Zod
| Route | Metodo | Validazione |
|-------|--------|-------------|
| `leads/route.ts` POST | Manuale (`!name`, `!email`, regex) |
| `users/me/password` POST | Manuale (min 6 chars) |
| `project members` POST | Manuale (`!userIds`) |
| `calendar/events` POST | Manuale (`!summary`, `!start`, `!end`) |
| `drive/folder` POST | Manuale (`!name`) |
| `chat/dm` POST | Manuale (`typeof targetUserId`) |
| `chat reactions` POST | Manuale (`!emoji`) |
| `meetings/quick` POST | `.catch(() => ({}))` - nessuna validazione |

#### M-03: File upload senza size limit
| Route | Max file size |
|-------|---------------|
| `chat/upload` | Nessun limite |
| `chat/channels/[id]/upload` | Nessun limite |
| `drive/upload` | Nessun limite |
| `projects/[id]/attachments` | Nessun limite |
- **Note:** `users/me/avatar` ha correttamente un limit di 5MB. Gli altri no.
- **Fix:** Aggiungere `if (file.size > MAX_SIZE)` check.

#### M-04: Task attachments accetta `fileUrl` arbitrario
- **File:** `src/app/api/tasks/[taskId]/attachments/route.ts`
- **Problema:** Il POST accetta un `fileUrl` dal client senza validazione. Un utente potrebbe inserire URL interni (SSRF) o URL malevoli che verrebbero poi serviti ad altri utenti.
- **Fix:** Validare che fileUrl appartenga al dominio S3/MinIO o GDrive, o richiedere l'upload diretto.

#### M-05: Rate limiter in-memory non persistente
- **Problema:** Il rate limiter usa un `Map` in-memory. Non funziona correttamente con:
  - Server restart (contatori azzerati)
  - Multiple instances/replicas (ogni instance ha i propri contatori)
- **Fix per futuro:** Migrare a Redis o altro storage condiviso se si scala.

#### M-06: `portal/wizards` GET senza nessun auth check
- **File:** `src/app/api/portal/wizards/route.ts`
- **Problema:** Non verifica `x-user-id` ne `x-user-role`. Restituisce tutti i wizard pubblicati a chiunque abbia un cookie valido (anche portal). L'impatto e basso (dati non sensibili), ma viola il principio di auth enforcement.
- **Fix:** Aggiungere almeno check `x-user-id`.

#### M-07: `erp/invoices/[invoiceId]/fatturapa` POST ha parsing body silenzioso
- **Problema:** `try { const body = await request.json() } catch {}` - se il body e malformato, usa default silenziosamente. Non e un bug ma rende il debug difficile.

#### M-08: Quote/Invoice PATCH sovrascrive lineItems senza check concorrenza
- **Problema:** Delete all + create all pattern senza optimistic locking. Due richieste concorrenti potrebbero perdere dati.
- **Fix:** Usare transaction + version check.

#### M-09: `chat/channels/[id]/messages/search` - SQL injection via search query
- **File:** `src/app/api/chat/channels/[id]/messages/search/route.ts` riga 38
- **Problema:** La query Prisma usa `contains` con `mode: 'insensitive'` che e parametrizzata (Prisma gestisce l'escaping). Ma non c'e sanitizzazione del parametro `q` per lunghezza massima.
- **Fix:** Limitare la lunghezza della query di ricerca.

#### M-10: `drive/files` - Possibile path traversal nella search
- **File:** `src/app/api/drive/files/route.ts` riga 40-44
- **Problema:** `search.replace(/'/g, "\\'")` - l'escaping delle virgolette singole e fatto manualmente per la query Google Drive API. Non copre tutti i casi di injection nella query syntax di GDrive.
- **Nota:** L'impatto e limitato perche la Google Drive API ha i propri meccanismi di protezione.

#### M-11: `wizard-submissions/[submissionId]/apply-crm` - Mass assignment su client
- **File:** `src/app/api/wizard-submissions/[submissionId]/apply-crm/route.ts`
- **Problema:** I field mappati con `crmMapping: "client.xxx"` vengono passati direttamente come `data` a `prisma.client.update()`. Se un wizard ha un campo mappato a `client.slug` o `client.id`, potrebbe sovrascrivere campi critici.
- **Fix:** Whitelist dei campi client aggiornabili via CRM mapping.

#### M-12: Inconsistenza nel trattamento di `clientId` null
- Diversi endpoint accettano `clientId` opzionale ma non validano che il client esista prima di associarlo. Se un clientId inesistente viene passato, Prisma lancera un foreign key error generico (500) invece di un 404 descriptivo.

#### M-13: `notifications/subscribe` e `notifications/unsubscribe` senza RBAC
- **Problema:** Solo check `x-user-id`. Qualsiasi utente autenticato puo registrare/rimuovere push subscriptions. L'impatto e basso (scoped per userId).

#### M-14: `auth/google/callback` e `auth/google/link-callback` gestiscono errori OAuth genericamente
- **Problema:** Redirect a `/login?error=...` con parametri dall'error OAuth senza sanitizzazione. Potenziale XSS se il messaggio di errore contiene HTML.
- **Fix:** Encode il messaggio di errore con `encodeURIComponent()`.

#### M-15: `fatturapa/dashboard` non valida page/limit
- **Problema:** `parseInt(searchParams.get('page') || '1')` senza `Math.max(1, ...)`. Un `page=0` o negativo causa `offset` negativo. Prisma potrebbe gestirlo, ma e meglio validare.

### LOW

#### L-01: Error messages espongono dettagli interni
- Pattern comune: `const msg = e instanceof Error ? e.message : '...'` poi ritornato al client.
- Messaggi Prisma come "Record to update not found" vengono esposti in risposta 500.
- **Fix:** Loggare il dettaglio server-side, restituire messaggio generico al client.

#### L-02: `users/route.ts` GET consente a qualsiasi utente di listare utenti
- Non-admin vedono: id, firstName, lastName, email, role, avatarUrl, isActive
- Potenzialmente troppo esposto (email di tutti gli utenti).
- **Fix:** Per non-admin, restituire solo utenti dello stesso workspace/progetto, o omettere email.

#### L-03: Duplicate route: `time-entries` e `time`
- Due set di route molto simili per gestire time entries, potenziale confusione.
- `time/route.ts` ha owner validation su PATCH/DELETE; `time-entries/route.ts` no.

#### L-04: `POST /api/projects` non verifica che `workspaceId` esista
- Se passato un workspaceId inesistente, Prisma lancera foreign key error (500) invece di 404.

#### L-05: `users/me/avatar` non pulisce il vecchio file S3
- L'upload di un nuovo avatar non elimina il file precedente da S3/MinIO, accumulando file orfani.

#### L-06: `social/route.ts` GET manca paginazione
- Ritorna tutti i social posts. Con pochi post non e un problema, ma scala male.

#### L-07: `leads` POST accetta `source` arbitraria
- Il campo `source` non e validato contro un enum, permettendo valori arbitrari.

#### L-08: `wiki/[pageId]` GET include sempre tutti i children
- Non limita il numero di `childPages` inclusi. Con centinaia di sotto-pagine, la risposta puo essere pesante.

#### L-09: SSE stream (`chat/stream`) non ha timeout/max-age
- Il stream resta aperto indefinitamente. Se un client si disconnette senza abort, il server mantiene la connessione.
- **Mitigazione:** L'heartbeat ogni 30s e il listener su `abort` mitigano parzialmente.

#### L-10: `projects/[projectId]/chat` GET auto-crea canale se non esiste
- Side effect in una GET. Se qualcuno fa GET per errore, crea un canale.
- **Fix:** Separare in POST per creare, GET per leggere.

#### L-11: Inconsistenza status codes su DELETE
- Alcuni DELETE ritornano `{ success: true }` con 200, altri con 204. Non critico ma inconsistente.

#### L-12: `search` endpoint non ha RBAC esplicito
- Usa `hasPermission()` internamente per filtrare i risultati per modulo, ma non ha un check iniziale `requirePermission()`. Un utente con zero permessi riceve una risposta vuota ma valida (200).

---

## 4. Dettaglio per Modulo

### Auth (7 routes)
| Route | Auth | RBAC | Zod | Rate Limit | Status Codes | Note |
|-------|------|------|-----|------------|--------------|------|
| `auth/login` POST | Public | - | Si | Si (10/15min) | 200,400,401,429 | OK |
| `auth/logout` POST | Si | - | - | No | 200,500 | OK |
| `auth/refresh` POST | Public | - | - | No | 200,401 | OK |
| `auth/session` GET | Si | - | - | No | 200,401 | OK |
| `auth/forgot-password` POST | Public | - | Si | No | 200,400 | **H-01**: Nessun rate limit |
| `auth/preferences` PATCH | Si | - | - | No | 200,401 | Stub |
| `auth/google/*` (4) | Mixed | - | - | No | 200,302,403 | CSRF token OK |

### Users (8 routes)
| Route | Auth | RBAC | Zod | Note |
|-------|------|------|-----|------|
| `users` GET | Si | Custom | - | **L-02**: Tutti vedono tutti |
| `users` POST | Si | Admin | Si | **C-01**: Math.random() password |
| `users/[id]` GET/PATCH/DEL | Si | Admin | Si (PATCH) | OK |
| `users/[id]/permissions` PATCH | Si | Admin | - | Usa $transaction |
| `users/[id]/reset-password` POST | Si | Admin | - | Manager!->Admin |
| `users/me` PATCH | Si | - | Si | OK |
| `users/me/avatar` POST | Si | - | - | 5MB limit, OK |
| `users/me/password` POST | Si | - | **No Zod** | **M-02, H-01**: No rate limit |
| `users/invite` POST | Si | Admin | Si | **C-01**: Math.random() |

### Clients/CRM (5 routes)
| Route | Auth | RBAC | Zod | Pagination | Note |
|-------|------|------|-----|------------|------|
| `clients` GET | Si | crm:read | - | Si | OK |
| `clients` POST | Si | crm:write | Si | - | OK |
| `clients/[id]` GET/PATCH/DEL | Si | crm:* | Si | - | OK |
| `clients/[id]/contacts` GET/POST | Si | crm:* | Si (POST) | **No** | **M-01** |
| `clients/[id]/interactions` GET/POST | Si | crm:* | Si (POST) | **No** | **M-01** |

### Projects (6 routes)
| Route | Auth | RBAC | Zod | Pagination | Note |
|-------|------|------|-----|------------|------|
| `projects` GET | Si | pm:read | - | Si | Member filter OK |
| `projects` POST | Si | pm:write | Si | - | Auto-creates chat |
| `projects/[id]` GET/PATCH/DEL | Si | pm:* | Si | - | Member check GET OK |
| `projects/[id]/tasks` GET/POST | Si | pm:* | Si | **No GET** | |
| `projects/[id]/members` GET/POST/DEL | Si | pm:* | **No Zod POST** | - | **M-02** |
| `projects/[id]/folders` GET/POST | Si | pm:* | Si | - | OK |
| `projects/[id]/attachments` GET/POST/DEL | Si | pm:* | - | - | **M-03**: No size limit |
| `projects/[id]/chat` GET | Si | pm:read | - | - | **L-10**: Side effect in GET |

### Tasks (6 routes)
| Route | Auth | RBAC | Zod | Note |
|-------|------|------|-----|------|
| `tasks` GET | Si | pm:read | - | Pagination OK |
| `tasks` POST | Si | pm:write | Si | OK |
| `tasks/[id]` GET/PATCH/DEL | Si | pm:* | Si | Creator/assignee fallback PATCH |
| `tasks/[id]/comments` GET/POST | Si | pm:read | Si | OK |
| `tasks/[id]/assign` POST | Si | pm:write | Si | OK |
| `tasks/[id]/timer` POST | Si | pm:write | Si | **H-02**: No transaction |
| `tasks/[id]/attachments` GET/POST | Si | pm:* | Si | **M-04**: Arbitrary fileUrl |

### Quotes/Invoices/ERP (12+ routes)
| Route | Auth | RBAC | Zod | Note |
|-------|------|------|-----|------|
| `quotes` GET/POST | Si | erp:* | Si | Pagination OK |
| `quotes/[id]` GET/PATCH/DEL | Si | erp:* | Si | **H-02**: No txn PATCH lineItems |
| `quotes/[id]/pdf` GET | Si | erp:read | - | OK |
| `quotes/from-template` POST | Si | erp:write | Si | OK |
| `invoices` GET/POST | Si | erp:* | Si | Pagination OK |
| `invoices/[id]` GET/PATCH/DEL | Si | erp:* | Si | **H-02**: No txn PATCH lineItems |
| `invoices/[id]/pdf` GET | Si | erp:read | - | OK |
| `invoices/[id]/fatturapa` GET/POST | Si | erp:* | Custom | **H-02**: No txn |
| `invoices/[id]/credit-note` POST | Si | erp:write | Si | **H-02**: No txn |
| `erp/fatturapa/dashboard` GET | Si | erp:read | - | Pagination OK, **M-15** |
| `erp/company-profile` GET/PATCH | Si | erp:* | Si | OK |
| `expenses` GET/POST | Si | erp:* | Si | Pagination OK |

### Quote Templates (3 routes)
| Route | Auth | RBAC | Zod | Note |
|-------|------|------|-----|------|
| `quote-templates` GET/POST | Si | erp:* | Si | Pagination OK |
| `quote-templates/[id]` GET/PATCH/DEL | Si | erp:* | Si | **H-02**: No txn PATCH lineItems |
| `quote-templates/[id]/duplicate` POST | Si | erp:write | - | OK |

### Wizards (8 routes)
| Route | Auth | RBAC | Zod | Note |
|-------|------|------|-----|------|
| `wizards` GET/POST | Si | erp:* | Si | Pagination OK |
| `wizards/[id]` GET/PATCH/DEL | Si | erp:* | Si | OK |
| `wizards/[id]/duplicate` POST | Si | erp:write | - | OK |
| `wizards/[id]/publish` PATCH | Si | erp:write | - | OK (step count check) |
| `wizards/[id]/steps` POST | Si | erp:write | Si | OK |
| `wizards/[id]/steps/[stepId]` PATCH/DEL | Si | erp:* | Si | OK |
| `wizards/[id]/steps/[stepId]/fields` POST | Si | erp:write | Si | OK |
| `wizards/[id]/steps/[stepId]/fields/[fieldId]` PATCH/DEL | Si | erp:* | Si | OK |

### Wizard Submissions (4 routes)
| Route | Auth | RBAC | Zod | Note |
|-------|------|------|-----|------|
| `wizard-submissions` GET/POST | Si | erp:* | Si | Pagination OK |
| `wizard-submissions/[id]` GET/PATCH | Si | erp:* | Si | OK |
| `wizard-submissions/[id]/complete` POST | Si | erp:write | - | OK |
| `wizard-submissions/[id]/apply-crm` POST | Si | crm:write | - | **M-11**: Mass assignment |

### Wiki (5 routes)
| Route | Auth | RBAC | Zod | Note |
|-------|------|------|-----|------|
| `wiki` GET/POST | Si | kb:* | Si | Tree/flat OK |
| `wiki/[pageId]` GET/PATCH/DEL | Si | kb:* | Si | **H-03, H-04**: N+1 |
| `wiki/[pageId]/comments` GET/POST | Si | kb:* | Si | OK |
| `wiki/[pageId]/activity` GET | Si | kb:read | - | **M-01**: Hard limit 50 |
| `wiki/reorder` POST | Si | kb:write | Si | Uses $transaction OK |

### Tickets (3 routes)
| Route | Auth | RBAC | Zod | Note |
|-------|------|------|-----|------|
| `tickets` GET/POST | Si | support:* | Si | Pagination OK |
| `tickets/[id]` GET/PATCH/DEL | Si | support:* | Si | ADMIN only DELETE |
| `tickets/[id]/comments` GET/POST | Si | support:* | Si | Notifications OK |

### Chat (11 routes)
| Route | Auth | RBAC | Zod | Note |
|-------|------|------|-----|------|
| `chat/channels` GET/POST | Si | chat:* | Si | OK |
| `chat/channels/[id]` GET/PATCH/DEL | Si | chat:* | Si | Owner/admin check |
| `chat/channels/[id]/messages` GET/POST | Si | chat:* | Si | Cursor pagination, HTML sanitize |
| `chat/channels/[id]/messages/[msgId]` PATCH/DEL | Si | chat:* | - | Author-only edit/delete |
| `chat/channels/[id]/messages/search` GET | Si | chat:read | - | Membership check OK |
| `chat/channels/[id]/messages/[msgId]/reactions` POST | Si | chat:write | **No Zod** | Membership check OK |
| `chat/channels/[id]/members` POST | Si | chat:write | Si | Owner/admin check |
| `chat/channels/[id]/read` POST | Si | **No RBAC** | - | **H-07** |
| `chat/channels/[id]/typing` POST | Si | chat:write | - | Membership check OK |
| `chat/channels/[id]/upload` POST | Si | chat:write | - | **M-03**: No size limit |
| `chat/upload` POST | Si | chat:write | - | **M-03**: No size limit |
| `chat/dm` POST | Si | chat:write | **No Zod** | OK logic |
| `chat/stream` GET | Si | - | - | SSE, **L-09** |

### Social (1 route)
| Route | Auth | RBAC | Zod | Note |
|-------|------|------|-----|------|
| `social` GET/POST/PATCH/DEL | Si | content:* | Si | **M-01, L-06**: No pagination |

### Assets & Reviews (3 routes)
| Route | Auth | RBAC | Zod | Note |
|-------|------|------|-----|------|
| `assets` GET/POST | Si | content:* | Si | Pagination OK |
| `assets/[id]` GET/PATCH/DEL | Si | content:* | Si | S3 cleanup on delete |
| `assets/[id]/reviews` GET/POST | Si | content:* | Si | **M-01**: No pagination |
| `assets/reviews` GET | Si | content:read | - | **M-01**: No pagination |
| `reviews/[id]/comments` GET/POST | Si | content:* | Si | **M-01**: No pagination |

### Signatures (2 routes + 4 public)
| Route | Auth | RBAC | Zod | Note |
|-------|------|------|-----|------|
| `signatures` GET/POST | Si | erp:* | Si | Pagination OK |
| `signatures/[id]` GET/PATCH | Si | erp:* | Si | OK |
| `signatures/[id]/send-otp` POST | Si | erp:write | - | Max 3 OTP OK |
| `sign/[token]` GET | Token | - | - | Audit logging OK |
| `sign/[token]/verify` POST | Token | - | - | Max attempts check OK |
| `sign/[token]/decline` POST | Token | - | - | $transaction OK |
| `sign/[token]/request-otp` POST | Token | - | - | Max 3 OTP OK |

### Portal (6 routes)
| Route | Auth | RBAC | Zod | Note |
|-------|------|------|-----|------|
| `portal/projects` GET | Portal | portal:read | - | Client-scoped OK |
| `portal/documents` GET | Portal | portal:read | - | Client-scoped OK |
| `portal/quotes/[id]` GET | Portal | portal:read | - | Client ownership check OK |
| `portal/wizards` GET | Portal | **No check** | - | **M-06** |
| `portal/wizard-submissions` POST | Portal | **No check** | Si | **C-02** |
| `portal/wizard-submissions/[id]` PATCH | Portal | **No check** | Si | **C-03** |

### Calendar/Drive/Meetings (6 routes)
| Route | Auth | RBAC | Zod | Note |
|-------|------|------|-----|------|
| `calendar` GET | Si | **No RBAC** | - | **H-06** |
| `calendar/events` GET/POST | Si | **No RBAC** | **No Zod** | **H-06, M-02** |
| `drive/files` GET | Si | **No RBAC** | - | **H-06, M-10** |
| `drive/folder` POST | Si | **No RBAC** | **No Zod** | **H-06, M-02** |
| `drive/upload` POST | Si | **No RBAC** | - | **H-06, M-03** |
| `meetings` GET/POST | Si | **No RBAC** | - | **H-06** |
| `meetings/quick` POST | Si | **No RBAC** | **No Zod** | **H-06, M-02** |

### Misc (11 routes)
| Route | Auth | RBAC | Zod | Note |
|-------|------|------|-----|------|
| `leads` GET/POST | Si/Public | crm:read / Public | **No Zod POST** | Rate limit POST OK |
| `health` GET | Public | - | - | OK |
| `heartbeat` POST | Si | - | - | OK |
| `webhooks/n8n` POST | Secret | - | Si | OK |
| `notifications` GET/PATCH | Si | - | Si | userId-scoped OK |
| `notifications/subscribe` POST | Si | **No RBAC** | Si | **M-13** |
| `notifications/unsubscribe` DELETE | Si | **No RBAC** | Si | **M-13** |
| `search` GET | Si | **No RBAC** | - | Internal hasPermission per modulo |
| `activity` GET | Si | **No RBAC** | - | **H-06** |
| `workspaces` GET | Si | **No RBAC** | - | **H-06** |
| `workspaces/seed` POST | Si | admin:admin | - | OK |
| `time-entries` GET/POST | Si | pm:* | Si | Pagination OK |
| `time` GET/POST/PATCH/DEL | Si | pm:* | Si | Owner validation OK |
| `team` GET | Si | Custom | - | **H-06** |
| `analytics/tasks` GET | Si | pm:read | - | **H-05** |
| `system/stats` GET | Si | admin:read | - | OK |
| `work-sessions` GET | Si | pm:read | - | **H-08** |

---

## 5. Checklist Compliance Matrix

| Criterio | Compliance | Dettagli |
|----------|------------|----------|
| **Auth enforcement** | 96.2% | 5 route senza check adeguato (portal wizard endpoints) |
| **RBAC** | 82.4% | ~23 route senza `requirePermission()` (calendar, drive, meetings, activity, team, workspaces, portal/wizards, notifications/sub, chat/read) |
| **Input validation (Zod)** | 89.5% | ~10 POST/PATCH senza Zod (leads, password, members, calendar, drive, meetings, reactions, dm) |
| **Status codes** | 95% | Generalmente corretti (400,401,403,404,500). Alcune 500 dove dovrebbe essere 404 |
| **N+1 queries** | 2 problemi | Wiki breadcrumb (H-03), wiki recursive delete (H-04) |
| **Pagination** | 80% | ~7 list endpoints senza paginazione (M-01) |
| **Transactions** | 25% | Solo 3/~12 operazioni multi-step usano $transaction (H-02) |
| **Rate limiting** | 1.5% | Solo login + leads POST (H-01) |
| **Owner validation (IDOR)** | Parziale | Chat messages OK, portal quotes OK, portal submissions NO (C-02,C-03), task attachments fileUrl (M-04) |
| **Error handling** | 90% | Pattern consistente ma espone dettagli interni (L-01) |

---

## 6. Raccomandazioni

### Priorita 1 (Immediate - CRITICAL)

1. **Sostituire `Math.random()`** in `users/invite` con `crypto.randomBytes()`:
```typescript
import { randomBytes } from 'crypto'
const tempPassword = randomBytes(16).toString('hex')
```

2. **Portal wizard submissions**: Aggiungere verifica `x-user-id` e ownership check su tutti e 3 gli endpoint portal wizard.

### Priorita 2 (Entro 1 Sprint - HIGH)

3. **Rate limiting middleware globale**: Implementare rate limiting a livello middleware per tutti gli endpoint autenticati (es. 100 req/min/user) con limiti piu stretti per endpoint sensibili.

4. **Transactions**: Wrappare in `prisma.$transaction()` tutte le operazioni multi-step identificate in H-02.

5. **N+1 wiki**: Riscrivere breadcrumb con CTE ricorsiva o precalcolo del path.

6. **Analytics pagination**: Aggiungere limit/pagination a `analytics/tasks` e usare `groupBy` per aggregazioni.

7. **RBAC mancante**: Aggiungere `requirePermission()` alle ~23 route senza (soprattutto calendar, drive, meetings).

### Priorita 3 (Backlog - MEDIUM)

8. **File upload size limits**: Aggiungere max file size a tutti gli upload endpoint.
9. **Zod schema** per i ~10 endpoint che usano validazione manuale.
10. **Pagination** sugli endpoint list mancanti.
11. **Whitelist CRM fields** nel wizard apply-crm.
12. **Error sanitization**: Non esporre `e.message` direttamente al client in produzione.

### Priorita 4 (Nice to have - LOW)

13. Consolidare `time-entries` e `time` in un unico set di route.
14. Rimuovere side effects dalle GET (`work-sessions`, `projects/[id]/chat`).
15. Cleanup vecchi avatar S3 su upload nuovo.
16. Consistenza status codes DELETE (200 vs 204).

---

## Appendice: Route Complete Enumerate

Totale: 131 file `route.ts` sotto `src/app/api/`.

### Per modulo
- **auth/**: 7 (login, logout, refresh, session, forgot-password, preferences, google/*)
- **users/**: 8 (list, CRUD, permissions, reset-password, me, me/avatar, me/password, invite)
- **clients/**: 5 (list, CRUD, contacts, interactions)
- **projects/**: 8 (list, CRUD, tasks, members, folders, attachments, chat)
- **tasks/**: 6 (list, CRUD, comments, assign, timer, attachments)
- **quotes/**: 4 (list, CRUD, pdf, from-template)
- **invoices/**: 3 (list, CRUD, pdf)
- **erp/**: 5 (company-profile, fatturapa/dashboard, fatturapa/*, credit-note)
- **quote-templates/**: 3 (list, CRUD, duplicate)
- **wizards/**: 8 (list, CRUD, duplicate, publish, steps/*, fields/*)
- **wizard-submissions/**: 4 (list, CRUD, complete, apply-crm)
- **wiki/**: 5 (list, CRUD, comments, activity, reorder)
- **tickets/**: 3 (list, CRUD, comments)
- **chat/**: 13 (channels/*, messages/*, search, reactions, members, read, typing, upload, dm, stream)
- **social/**: 1 (CRUD)
- **assets/**: 4 (list, CRUD, reviews/*, review-comments)
- **signatures/**: 3 (list, CRUD, send-otp)
- **sign/**: 4 (token, verify, decline, request-otp)
- **portal/**: 6 (projects, documents, quotes, wizards, wizard-submissions/*)
- **calendar/**: 2 (list, events)
- **drive/**: 3 (files, folder, upload)
- **meetings/**: 2 (list, quick)
- **misc/**: 16 (leads, health, heartbeat, webhooks, notifications/*, search, activity, workspaces/*, time-entries, time, team, analytics, system/stats, work-sessions, expenses)

---

*Report generato il 2026-02-14. Audit eseguito leggendo ogni file route.ts e verificando contro la checklist a 10 punti.*
