# FODI OS - Security Audit Report

**Data:** 2026-02-14
**Auditor:** Claude Opus 4.6 (Security Auditor Agent)
**Scope:** `/var/www/projects/fodi-os/src/`
**Versione analizzata:** Codebase corrente al 2026-02-14

---

## Executive Summary

Il progetto FODI OS ha una base di sicurezza **solida** per un'applicazione gestionale interna. L'architettura JWT + cookie HttpOnly, bcrypt per le password, rate limiting su login, Prisma ORM (no raw SQL), validazione Zod, e un sistema RBAC ben strutturato sono tutti punti positivi. Tuttavia, sono state identificate **4 vulnerabilita CRITICAL**, **5 HIGH**, **6 MEDIUM** e **5 LOW** che richiedono attenzione.

---

## Findings

### CRITICAL-01: Refresh Token Non Ruotato dopo Uso

**File:** `src/app/api/auth/refresh/route.ts:29-35`, `src/middleware.ts:54-69`
**Severity:** CRITICAL
**CVSS:** 8.1

**Descrizione:**
Quando un refresh token viene usato per ottenere un nuovo access token, il vecchio refresh token rimane **valido e riutilizzabile** per tutta la sua durata (7 giorni). La route `/api/auth/refresh` e il middleware `tryRefreshAccess()` generano un nuovo access token ma **non ruotano il refresh token** -- non lo invalidano nel DB e non ne emettono uno nuovo.

**Impatto:**
Se un attaccante ruba un refresh token (es. via XSS su un sottodominio, leak nei log, o MITM su connessione non-HTTPS), puo generare access token illimitatamente per 7 giorni senza che l'utente legittimo se ne accorga.

**Proof of Concept:**
```
1. Utente fa login -> ottiene refresh_token_A
2. Attaccante ruba refresh_token_A
3. Utente usa l'app normalmente, refresh_token_A viene usato per generare nuovi access token
4. refresh_token_A rimane valido nel DB
5. Attaccante usa refresh_token_A per generare i propri access token
6. Nessun alert, nessuna invalidazione
```

**Remediation:**
Implementare **refresh token rotation**: quando un refresh token viene usato, invalidarlo nel DB e generarne uno nuovo. Se un refresh token gia usato viene ripresentato, invalidare TUTTI i refresh token dell'utente (possibile furto).

---

### CRITICAL-02: Middleware Refresh Bypassa il Check DB per Token Revocati

**File:** `src/middleware.ts:48-69` (commento a riga 52-53)
**Severity:** CRITICAL
**CVSS:** 8.0

**Descrizione:**
Il middleware `tryRefreshAccess()` verifica **solo la firma JWT** del refresh token ma **non controlla nel database** se il token e stato revocato. Il commento nel codice lo conferma:

```typescript
/**
 * Note: This only verifies the JWT signature in the middleware (edge runtime).
 * The DB check for revoked tokens happens on the actual API call.
 */
```

Ma la route `/api/auth/refresh` (che fa il check DB) non viene chiamata dal middleware. Il middleware genera direttamente un nuovo access token valido **senza verificare la revoca nel DB**.

**Impatto:**
Dopo un logout, il refresh token rimane nel cookie del browser. Anche se il token e stato cancellato dal DB al logout, qualsiasi richiesta successiva che triggera il middleware auto-refresh produrra comunque un nuovo access token valido, perche il middleware non controlla il DB.

**Remediation:**
Due opzioni:
1. Fare il redirect alla route `/api/auth/refresh` (che fa il check DB) invece di generare il token direttamente nel middleware
2. Aggiungere un meccanismo lightweight per check revoca nel middleware (es. token family ID o versione)

---

### CRITICAL-03: Password Temporanea Generata con Math.random() (Non Crittografico)

**File:** `src/app/api/users/invite/route.ts:18-24`
**Severity:** CRITICAL
**CVSS:** 7.5

**Descrizione:**
La funzione `generateTempPassword()` nella route `/api/users/invite` usa `Math.random()` che NON e crittograficamente sicuro:

```typescript
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}
```

**Nota:** La stessa funzione in `src/app/api/users/[id]/reset-password/route.ts:8-12` usa correttamente `crypto.getRandomValues()`. L'inconsistenza mostra che il fix e noto ma non applicato ovunque.

**Impatto:**
`Math.random()` ha uno stato interno prevedibile. Un attaccante che conosce le password generate di recente potrebbe predire le prossime.

**Remediation:**
Sostituire `Math.random()` con `crypto.getRandomValues()` (come gia fatto in reset-password):
```typescript
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}
```

---

### CRITICAL-04: N8N Webhook Secret Vuoto Accettato Come Valido

**File:** `src/app/api/webhooks/n8n/route.ts:5,38-39`
**Severity:** CRITICAL
**CVSS:** 9.0

**Descrizione:**
```typescript
const webhookSecret = process.env.N8N_WEBHOOK_SECRET || ''
// ...
if (!webhookSecret || secret !== webhookSecret) {
```

Se `N8N_WEBHOOK_SECRET` non e definito nell'environment (manca dal `.env.example`!), `webhookSecret` diventa stringa vuota. La condizione `!webhookSecret` ritorna `true` e la richiesta viene respinta. **PERO**: se un attaccante invia `x-n8n-secret: ''` (header vuoto), e `N8N_WEBHOOK_SECRET` e definito come stringa vuota, `secret !== webhookSecret` diventa `'' !== ''` = false, e la richiesta passa.

Inoltre, `N8N_WEBHOOK_SECRET` non e presente nel `.env.example`, rendendo molto probabile che non venga configurato.

**Impatto:**
Un attaccante puo:
- Creare notifiche arbitrarie per qualsiasi utente (`notification`)
- Aggiornare lo status di qualsiasi task (`task_update`)
- Modificare dati di qualsiasi cliente (`client_update`)

**Remediation:**
1. Aggiungere `N8N_WEBHOOK_SECRET=change-me` al `.env.example`
2. Rifiutare richieste se il secret non e configurato:
```typescript
if (!webhookSecret) throw new Error('N8N_WEBHOOK_SECRET not configured')
if (secret !== webhookSecret) return 401
```

---

### HIGH-01: Nessuna Complessita Password Richiesta

**File:** `src/lib/validation/auth.ts:5`, `src/app/api/users/me/password/route.ts:15`
**Severity:** HIGH
**CVSS:** 6.5

**Descrizione:**
Lo schema di login accetta qualsiasi password non vuota (`min(1)`). Il cambio password richiede solo 6 caratteri (`newPassword.length < 6`). Non c'e nessun requisito di complessita: niente maiuscole, numeri, caratteri speciali. L'invito utente non ha nemmeno il check di lunghezza perche la password e generata.

**Impatto:**
Password deboli come "123456", "password", "aaaaaa" sono accettate. In combinazione con la mancanza di rate limiting su password change, un attaccante con accesso al sistema potrebbe facilmente indovinare password di altri utenti.

**Remediation:**
Aggiungere validazione password nel schema Zod:
```typescript
const passwordSchema = z.string()
  .min(8, 'Minimo 8 caratteri')
  .regex(/[A-Z]/, 'Almeno una maiuscola')
  .regex(/[0-9]/, 'Almeno un numero')
```

---

### HIGH-02: Google OAuth Tokens Salvati in Plaintext nel DB

**File:** `src/app/api/auth/google/callback/route.ts:55-72`
**Severity:** HIGH
**CVSS:** 6.0

**Descrizione:**
I token Google OAuth (accessToken e refreshToken) sono salvati nel database in **chiaro**, senza crittografia:

```typescript
await prisma.googleToken.upsert({
  create: {
    accessToken: tokens.access_token,     // plaintext!
    refreshToken: tokens.refresh_token,   // plaintext!
    ...
  },
})
```

Non esiste nessun modulo di encrypt/decrypt nel progetto.

**Impatto:**
Se il database viene compromesso (SQL injection, backup non cifrato, accesso non autorizzato), l'attaccante ottiene accesso completo a Google Calendar, Google Drive e email di tutti gli utenti collegati.

**Remediation:**
Cifrare i token Google con una chiave derivata dall'environment (es. `ENCRYPTION_KEY`) usando AES-256-GCM prima di salvarli nel DB. Decifrare on-the-fly quando servono.

---

### HIGH-03: File Upload Senza Size Limit (Chat e Project Attachments)

**File:** `src/app/api/chat/upload/route.ts`, `src/app/api/chat/channels/[id]/upload/route.ts`, `src/app/api/projects/[projectId]/attachments/route.ts`
**Severity:** HIGH
**CVSS:** 6.0

**Descrizione:**
Solo l'upload avatar ha un file size limit (`MAX_FILE_SIZE = 5MB`). Gli endpoint di upload per chat e project attachments **non hanno nessun limite di dimensione**:

- `/api/chat/upload` - nessun check `file.size`
- `/api/chat/channels/[id]/upload` - nessun check `file.size`
- `/api/projects/[projectId]/attachments` - nessun check `file.size`

**Impatto:**
Un utente autenticato puo caricare file di dimensioni arbitrarie (centinaia di MB o GB), causando:
- Esaurimento spazio disco/S3
- Denial of Service
- Costi storage elevati

**Remediation:**
Aggiungere check dimensione file in tutti gli endpoint di upload:
```typescript
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
if (file.size > MAX_FILE_SIZE) {
  return NextResponse.json({ error: 'File troppo grande (max 50MB)' }, { status: 400 })
}
```

---

### HIGH-04: Signature Token Fallback a JWT_SECRET

**File:** `src/lib/signature-token.ts:3-5`
**Severity:** HIGH
**CVSS:** 6.5

**Descrizione:**
```typescript
const SIGNATURE_SECRET = new TextEncoder().encode(
  process.env.SIGNATURE_SECRET || process.env.JWT_SECRET!
)
```

Se `SIGNATURE_SECRET` non e configurato (non e nel `.env.example`), usa `JWT_SECRET`. Questo significa che la stessa chiave firma sia le sessioni utente sia i link di firma documenti.

**Impatto:**
La separazione dei secrets e un principio fondamentale. Se JWT_SECRET viene compromesso, TUTTI i meccanismi di firma sono compromessi simultaneamente. Inoltre un token di firma valido potrebbe essere confuso con un token di sessione se il parsing non e rigoroso.

**Remediation:**
1. Aggiungere `SIGNATURE_SECRET=change-me-generate-with-openssl-rand-hex-64` al `.env.example`
2. Rendere SIGNATURE_SECRET obbligatorio:
```typescript
if (!process.env.SIGNATURE_SECRET) throw new Error('SIGNATURE_SECRET required')
```

---

### HIGH-05: Portal Wizard Endpoints Senza Autenticazione

**File:** `src/app/api/portal/wizards/route.ts`, `src/app/api/portal/wizard-submissions/route.ts`, `src/app/api/portal/wizard-submissions/[submissionId]/route.ts`
**Severity:** HIGH
**CVSS:** 6.5

**Descrizione:**
Tre endpoint del portale non verificano ne autenticazione ne ruolo:
- `GET /api/portal/wizards` - lista tutti i wizard pubblicati (nessun auth check)
- `POST /api/portal/wizard-submissions` - crea submission (nessun auth check)
- `PATCH /api/portal/wizard-submissions/[id]` - aggiorna submission (nessun auth check)

Sono sotto `/api/` ma non sotto `/api/auth/`, quindi il middleware richiede autenticazione. **PERO** il middleware imposta `x-user-id` e `x-user-role` dagli header JWT ma questi endpoint non li controllano -- qualsiasi utente autenticato (anche CLIENT) puo accedere.

Il problema piu grave e che `/api/portal/wizard-submissions/[submissionId]` permette a qualsiasi utente di aggiornare QUALSIASI submission (senza verificare appartenenza), e cambiare le `answers` di una submission altrui.

**Impatto:**
- Enumerazione dei wizard disponibili (leak informazioni)
- Modifica delle risposte di submission altrui (data tampering)
- Nessun controllo su chi crea/modifica submission

**Remediation:**
Aggiungere check di ownership:
```typescript
if (existing.submitterEmail !== userEmail && role !== 'ADMIN') {
  return 403
}
```

---

### MEDIUM-01: CSP Contiene unsafe-inline e unsafe-eval

**File:** `src/middleware.ts:86`
**Severity:** MEDIUM
**CVSS:** 5.0

**Descrizione:**
La Content Security Policy include:
```
script-src 'self' 'unsafe-inline' 'unsafe-eval'
style-src 'self' 'unsafe-inline'
```

`unsafe-inline` e `unsafe-eval` per gli script riducono significativamente la protezione contro XSS. `unsafe-eval` in particolare permette `eval()`, `setTimeout("string")`, ecc.

**Impatto:**
Se un attaccante trova un vettore XSS (es. via Tiptap content, XML preview, o headerHtml/footerHtml nei template), la CSP non blocchera l'esecuzione del payload.

**Remediation:**
Sostituire `unsafe-inline` con nonce-based CSP e rimuovere `unsafe-eval`. Per Next.js:
```
script-src 'self' 'nonce-{random}'; style-src 'self' 'unsafe-inline';
```
Nota: `unsafe-inline` per gli stili e accettabile per la maggior parte delle applicazioni.

---

### MEDIUM-02: XSS nel XML Preview via dangerouslySetInnerHTML

**File:** `src/components/erp/XmlPreviewModal.tsx:35-48,70`
**Severity:** MEDIUM
**CVSS:** 5.5

**Descrizione:**
La funzione `highlightXml()` fa sanitizzazione con HTML entity encoding (`&`, `<`, `>`), ma poi re-inietta tag HTML per la colorazione della sintassi:

```typescript
.replace(/&lt;(\/?[\w:]+)/g, '<span class="text-indigo-500">&lt;$1</span>')
```

Il contenuto `xmlContent` viene passato come prop -- se proviene da una fattura XML caricata da un utente, potrebbe contenere payload XSS crafted che sopravvivono alla sanitizzazione parziale. In particolare, la regex `[\w:]` limita ma non elimina completamente il rischio.

**Impatto:**
XSS stored se un utente carica un XML malevolo con attributi che sopravvivono alla regex. Basso rischio in pratica perche:
1. Solo utenti autenticati con ruolo ERP possono vedere il preview
2. L'encoding iniziale e ragionevolmente robusto
3. La CSP (seppur debole) limita leggermente il rischio

**Remediation:**
Usare una libreria di syntax highlighting vera (es. `highlight.js`, `prism.js`) che gestisca il rendering in modo sicuro, oppure usare un DOM sandbox (`<iframe sandbox>`).

---

### MEDIUM-03: headerHtml/footerHtml nei Quote Templates Non Sanitizzato

**File:** `src/lib/validation/quote-templates.ts:18-19,43-44`
**Severity:** MEDIUM
**CVSS:** 5.0

**Descrizione:**
I campi `headerHtml` e `footerHtml` sono validati come `z.string().optional().nullable()` senza nessuna sanitizzazione HTML. Anche se attualmente il PDF generator non li usa (usa dati strutturati), questi campi sono salvati nel DB e potrebbero essere renderizzati in futuro nel frontend con `dangerouslySetInnerHTML`.

**Impatto:**
Stored XSS se un amministratore inserisce HTML malevolo nei template e questo viene poi renderizzato nel browser (attualmente rischio teorico, ma i campi esistono nel DB).

**Remediation:**
Sanitizzare HTML in input con una libreria come `dompurify` o `sanitize-html`, oppure usare un formato strutturato (JSON) per header/footer.

---

### MEDIUM-04: Rate Limiting In-Memory (Non Distribuito)

**File:** `src/lib/rate-limit.ts`
**Severity:** MEDIUM
**CVSS:** 4.5

**Descrizione:**
Il rate limiting usa una `Map` in-memory. In un deployment con multiple istanze (scale-out), ogni istanza ha il proprio contatore e un attaccante puo distribuire le richieste tra le istanze per bypassare il limite.

Inoltre, il rate limiting e applicato solo a:
- `/api/auth/login` (5 req/60s per IP)
- `/api/leads` POST (10 req/60s per IP)

Ma **non** a:
- `/api/users/me/password` (cambio password) - brute force possibile
- `/api/sign/[token]/verify` (OTP verify) - gestito solo da maxAttempts nel DB
- `/api/auth/forgot-password` - nessun rate limit, usabile per email enumeration

**Impatto:**
- Bypassabile in deployment multi-istanza
- Mancante su endpoint sensibili

**Remediation:**
1. Usare Redis per rate limiting distribuito (gia disponibile nell'infrastruttura)
2. Aggiungere rate limiting a `/api/users/me/password`, `/api/auth/forgot-password`

---

### MEDIUM-05: CSRF Protection Incompleta (Solo SameSite=Lax)

**File:** `src/lib/auth.ts:57-70`, `src/middleware.ts`
**Severity:** MEDIUM
**CVSS:** 4.0

**Descrizione:**
La protezione CSRF si basa esclusivamente su `sameSite: 'lax'` nei cookie. Non c'e:
- No CSRF token dedicato
- No Origin/Referer header validation
- No custom header check (X-Requested-With)

`SameSite=Lax` protegge da CSRF su POST cross-site da form submission, ma **non protegge** da:
- GET requests che modificano stato (non presenti attualmente - OK)
- Richieste da sottodomini dello stesso sito
- Attacchi che sfruttano redirect per trasformare GET in POST con cookie allegati

**Impatto:**
Rischio basso per l'attuale deployment (applicazione interna con dominio dedicato), ma non conforme alle best practices di sicurezza.

**Remediation:**
Aggiungere verifica Origin header nel middleware per le richieste state-changing:
```typescript
if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
  const origin = request.headers.get('origin')
  if (origin && !origin.endsWith('.fodisrl.it')) {
    return 403
  }
}
```

---

### MEDIUM-06: Manager Puo Creare Admin via Invite

**File:** `src/app/api/users/invite/route.ts:44-45`
**Severity:** MEDIUM
**CVSS:** 5.5

**Descrizione:**
La route invite verifica che il chiamante sia ADMIN o MANAGER (`ADMIN_ROLES`), ma non impedisce a un MANAGER di creare un utente con ruolo ADMIN:

```typescript
const assignedRole: Role = userRole && VALID_ROLES.includes(userRole) ? userRole : 'DEVELOPER'
```

`VALID_ROLES` include `'ADMIN'`. Un Manager puo invitare un utente con ruolo ADMIN, poi il nuovo admin puo fare qualsiasi cosa.

**Nota:** In `users/[id]/route.ts` e `users/[id]/reset-password/route.ts`, c'e protezione (`Managers cannot delete admins`), ma nella creazione no.

**Impatto:**
Privilege escalation: un Manager crea un utente ADMIN controllato da lui.

**Remediation:**
```typescript
if (role === 'MANAGER' && assignedRole === 'ADMIN') {
  return NextResponse.json({ error: 'Un Manager non puo creare utenti Admin' }, { status: 403 })
}
```

---

### LOW-01: Signature Token Scadenza 7 Giorni (Eccessiva)

**File:** `src/lib/signature-token.ts:14`
**Severity:** LOW
**CVSS:** 3.0

**Descrizione:**
I token per la firma documenti hanno scadenza di 7 giorni. Questo e un periodo lungo durante il quale un link di firma intercettato puo essere usato.

**Remediation:**
Considerare di ridurre a 48-72 ore, allineandosi con la `expiresInDays` configurabile nella signature request (default 7 ma max 30).

---

### LOW-02: Leads POST Non Valida Formato Email

**File:** `src/app/api/leads/route.ts:58-66`
**Severity:** LOW
**CVSS:** 2.5

**Descrizione:**
La validazione del lead POST e minima:
```typescript
if (!name || !email || !message) {
```

Non c'e validazione del formato email, lunghezza massima dei campi, o sanitizzazione. Il campo `source` accetta qualsiasi stringa.

**Remediation:**
Usare uno schema Zod come per le altre route:
```typescript
const leadSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(255),
  message: z.string().min(1).max(5000),
  // ... altri campi opzionali
})
```

---

### LOW-03: Error Messages Espongono Dettagli Interni

**File:** Multipli endpoint (pattern `e instanceof Error ? e.message : ...`)
**Severity:** LOW
**CVSS:** 2.0

**Descrizione:**
Molte route restituiscono il messaggio di errore diretto dall'eccezione:
```typescript
const msg = e instanceof Error ? e.message : 'Errore interno del server'
return NextResponse.json({ error: msg }, { status: 500 })
```

Questo puo esporre path interni, nomi di tabelle DB, messaggi Prisma, ecc.

**Remediation:**
In produzione, loggare l'errore completo server-side ma restituire solo un messaggio generico al client. Esempio:
```typescript
console.error(`[${routeName}]`, e)
return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
```

---

### LOW-04: Google Drive Files Impostati come Pubblici

**File:** `src/lib/storage.ts:104-111`
**Severity:** LOW
**CVSS:** 3.5

**Descrizione:**
Tutti i file caricati su Google Drive vengono automaticamente resi pubblici ("anyone with the link can view"):
```typescript
await drive.permissions.create({
  fileId,
  requestBody: { role: 'reader', type: 'anyone' },
})
```

**Impatto:**
I file di progetto (documenti, contratti, attachment) sono accessibili a chiunque abbia il link. Se un link viene condiviso accidentalmente o indicizzato da Google, i documenti diventano pubblici.

**Remediation:**
Usare permessi piu restrittivi (es. domain-restricted o specific users) e servire i file tramite un proxy server-side che verifica l'autenticazione.

---

### LOW-05: Chat Upload Key Usa Math.random()

**File:** `src/app/api/chat/upload/route.ts:27`
**Severity:** LOW
**CVSS:** 1.5

**Descrizione:**
```typescript
const key = `chat/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
```

`Math.random()` per il filename non e un rischio di sicurezza critico (il file e autenticato e su S3 privato), ma la prevedibilita potrebbe permettere a un utente di enumerare file di altri utenti se il bucket S3 non ha ACL rigorosi.

**Nota:** `src/app/api/chat/channels/[id]/upload/route.ts:41` usa correttamente `crypto.randomUUID()`.

**Remediation:**
Sostituire con `crypto.randomUUID()` per consistenza.

---

## Positive Findings (Buone Pratiche Gia Implementate)

| Area | Dettaglio |
|------|-----------|
| **Password Hashing** | bcrypt con cost factor 12 - ottimo |
| **JWT Implementation** | Token separati access/refresh con secrets diversi, jose library (standard) |
| **Cookie Security** | httpOnly, secure in production, sameSite lax, path / |
| **SQL Injection** | Prisma ORM usato ovunque, zero `$queryRaw`/`$executeRaw` |
| **Input Validation** | Zod schema su quasi tutte le route |
| **RBAC** | Sistema ruoli ben strutturato con 8 ruoli e permessi per modulo |
| **Login Rate Limiting** | 5 tentativi/minuto per IP |
| **OTP Security** | `crypto.randomInt()` (CSPRNG), maxAttempts=3 per OTP, OTP scade in 10min, max 3 OTP per request |
| **File Upload** | Blocklist estensioni pericolose (exe, bat, php, etc.) su tutti gli endpoint |
| **Security Headers** | X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy |
| **Portal Isolation** | Portal routes filtrano per portalUserId -> clientId (corretto) |
| **OAuth State** | Google OAuth usa JWT-signed state token con expiry 10min (anti-CSRF) |
| **Login Enumeration** | forgot-password risponde sempre uguale indipendentemente dall'esistenza dell'email |
| **Admin Self-Protection** | Blocco auto-disattivazione, auto-cambio ruolo, auto-eliminazione |
| **Manager Escalation Guards** | Manager non puo eliminare admin o resettare password admin |
| **Audit Trail** | Signature flow ha audit completo (viewed, otp_sent, otp_failed, signed, declined) |
| **Filename Sanitization** | `file.name.replace(/[\/\\:*?"<>|]/g, '_')` su drive e project attachments |
| **Tiptap Content** | Usa JSON format con ProseMirror schema (anti-XSS by default) |

---

## Remediation Priority Matrix

| # | Finding | Severity | Effort | Priority |
|---|---------|----------|--------|----------|
| CRITICAL-04 | N8N webhook secret vuoto | CRITICAL | Basso (15 min) | **IMMEDIATO** |
| CRITICAL-03 | Math.random() per password | CRITICAL | Basso (5 min) | **IMMEDIATO** |
| CRITICAL-01 | Refresh token non ruotato | CRITICAL | Medio (2h) | **Entro 1 settimana** |
| CRITICAL-02 | Middleware bypass DB check | CRITICAL | Medio (2h) | **Entro 1 settimana** |
| HIGH-03 | File upload senza size limit | HIGH | Basso (30 min) | **Entro 1 settimana** |
| HIGH-05 | Portal wizard senza auth | HIGH | Basso (30 min) | **Entro 1 settimana** |
| HIGH-01 | Password senza complessita | HIGH | Basso (30 min) | **Entro 2 settimane** |
| HIGH-04 | Signature secret fallback | HIGH | Basso (15 min) | **Entro 2 settimane** |
| HIGH-02 | Google tokens plaintext | HIGH | Medio (3h) | **Entro 1 mese** |
| MEDIUM-06 | Manager crea Admin | MEDIUM | Basso (10 min) | **Entro 2 settimane** |
| MEDIUM-01 | CSP unsafe-inline/eval | MEDIUM | Alto (1g) | **Entro 1 mese** |
| MEDIUM-04 | Rate limit in-memory | MEDIUM | Medio (2h) | **Entro 1 mese** |
| MEDIUM-02 | XSS XML Preview | MEDIUM | Medio (1h) | **Entro 1 mese** |
| MEDIUM-03 | headerHtml non sanitizzato | MEDIUM | Basso (30 min) | **Entro 1 mese** |
| MEDIUM-05 | CSRF solo SameSite | MEDIUM | Basso (1h) | **Entro 1 mese** |
| LOW-01-05 | Vari | LOW | Vario | **Backlog** |

---

## Conclusioni

FODI OS e una applicazione gestionale interna con una solida base di sicurezza. I **fix immediati** (CRITICAL-03 e CRITICAL-04) richiedono meno di 20 minuti di lavoro e dovrebbero essere implementati subito. I fix per il refresh token (CRITICAL-01 e CRITICAL-02) richiedono piu lavoro ma sono essenziali per la sicurezza delle sessioni a lungo termine.

L'assenza di vulnerabilita SQL injection, la buona implementazione RBAC, e la validazione input consistente con Zod sono punti di forza significativi.
