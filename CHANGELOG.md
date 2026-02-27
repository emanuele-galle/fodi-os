# Changelog - FODI OS

Tutte le modifiche significative al progetto sono documentate in questo file.

## [0.8.0] - 2026-02-27

### Nuove Funzionalità

#### Integrazione Microsoft To Do
- **Sync bidirezionale** — Le task di FODI OS si sincronizzano automaticamente con Microsoft To Do
- **OAuth2 per account personali** — Collegamento tramite account Microsoft personale (non richiede M365)
- **Sync iniziale automatico** — Alla connessione, tutte le task attive vengono pushate verso To Do
- **Sync in tempo reale** — Webhook Microsoft Graph per notifiche istantanee + delta sync periodico
- **Mapping completo** — Status, priorità, scadenze e descrizioni sincronizzati in entrambe le direzioni
- **Conflict resolution** — Last-write-wins basato su timestamp per gestire modifiche simultanee
- **Linked resources** — Ogni task su To Do ha un link diretto al gestionale
- **UI in Impostazioni** — Card dedicata per collegare/scollegare/sincronizzare manualmente

#### Progetti & Task
- **Subtask a livelli** — Card task annidate sotto i task padre (layer system)
- **Sottocartelle** — Supporto sottocartelle e subtask gerarchici
- **Drag & drop cartelle** — Riordinamento e reparenting cartelle via drag & drop
- **Collegamenti esterni** — Tab "Collegamenti" nei progetti per link esterni
- **Pulsante Nuova Task** — Nell'header con assegnazione team nel quick input
- **CSV export** — Esportazione task in formato CSV
- **Activity log task** — Storico attività per ogni singolo task
- **Auto-sync boardColumn** — La colonna kanban si aggiorna automaticamente al cambio status

#### Calendario
- **Vista giornaliera** — Day View completa con orari 0-23
- **Calendario day-first** — Settimana parte dal lunedì

#### Chat
- **Canali progetto globali** — I canali progetto con messaggi non letti appaiono nella chat globale

#### Contratti
- **Template contratti** — Modelli riutilizzabili con generazione PDF e workflow firma

#### Storage
- **Cloudflare R2 CDN** — Storage primario con fallback MinIO locale

#### Infrastruttura
- **Cron scheduler integrato** — Digest giornaliero, report, deadline e reminder gestiti internamente
- **Login con username** — Accesso sia con email che con username
- **Upload fino a 1GB** — Limite body size aumentato per middleware e server actions
- **Branding dinamico** — Tutte le referenze hardcoded sostituite con il sistema brand

### Performance & Refactoring
- Ottimizzazione query N+1, memory safety, error handling (Fase 2)
- Ottimizzazione performance dashboard e infrastruttura
- Centralizzazione costanti, hook useFetch, type safety, API errors
- Centralizzazione email templates e PDF utilities
- Split file giganti, loading states, accessibilità e ottimizzazione immagini

### Bug Fix
- Fix auto-logout da race condition token rotation
- Fix push notifications e caricamento eventi calendario
- Fix chat canali e timer intelligente
- Fix realtime sync per pagina dettaglio progetto e riassegnazione task
- Fix filtering task, display creatore, persistenza login
- Fix ottimizzazione UI/UX mobile completa
- Fix download proxy per allegati progetto

### CI/CD
- Docker cleanup automatico dopo deploy per liberare spazio disco

---

## [0.7.0] - 2026-02-17

### Nuove Funzionalità

#### Sicurezza: Verifica IP con OTP
- **Autenticazione doppia IP-based** — Login da IP non riconosciuto richiede verifica OTP via email (6 cifre, scadenza 10 min)
- **IP trusted automatici** — Dopo verifica, l'IP viene salvato e non richiede più OTP
- **Rate limiting su 3 livelli** — Login (5/min per IP), invio OTP (3/10min per utente), verifica (5/5min per IP)
- **OTP hashato con bcrypt** — Mai salvato in chiaro nel database
- **Email di sicurezza** — Template dedicato con IP sospetto, codice OTP e avviso cambio password
- **Seed IP esistenti** — Script per seedare gli IP attuali degli utenti come trusted (nessun blocco al primo accesso)

#### Calendario
- **Filtro calendario Fodi** — Il calendario mostra automaticamente gli eventi del calendario "Fodi Srl" se disponibile

#### Chat
- **Read receipts** — Conferme di lettura in tempo reale nei messaggi (chi ha letto, quando)

### Modifiche Tecniche

- Nuovi modelli Prisma: `TrustedIp`, `LoginOtp` con relazioni su `User`
- Nuovo modulo `src/lib/email.ts` condiviso (estratto da `signature-email.ts`)
- Nuova API `POST /api/auth/verify-ip` per verifica OTP
- Nuova pagina `/verify-ip` con input 6 digit, auto-advance, paste support
- Middleware aggiornato: `/verify-ip` aggiunta a PUBLIC_PATHS
- Schema validazione: aggiunto `verifyIpOtpSchema`
- API login: check IP trusted, generazione OTP, risposta 403 con `requiresIpVerification`
- API chat messages: campo `readStatus` nella risposta GET
- API chat read: broadcast SSE `message_read` event
- Componenti chat: `MessageBubble` e `MessageThread` supportano read receipts

---

## [0.6.0] - 2026-02-16

### Nuove Funzionalità

#### Digital Business Card (NFC)
- **Card digitale premium** — Design dark glassmorphism con animazioni
- **Social completi** — Facebook, TikTok, YouTube, Telegram, WhatsApp
- **Google Calendar booking** — Prenotazione appuntamenti integrata
- **Lead capture wizard** — Form multi-step nella card per raccogliere contatti
- **Leggibilità migliorata** — Font più grandi e contrasto per tutti gli utenti

#### CRM & ERP
- **Deals pipeline** — Gestione trattative con stage, probabilità, valore
- **Tasks avanzati** — Urgency system, focus del giorno, deadline notifications
- **Spese ricorrenti** — Gestione abbonamenti con frequenza e auto-rinnovo
- **Azioni inline** — Edit/delete rapido su preventivi, firme, wizards

#### UX & Mobile
- **Fix zoom iOS** — Prevenuto zoom accidentale su input mobile
- **Upload senza limiti** — Rimossi limiti su dimensione e estensione file
- **Navigazione migliorata** — Link Card Digitale in settings, task cards cliccabili

### Bug Fix
- Fix permessi SALES (PM write per SALES, CONTENT, SUPPORT)
- Fix salvataggio card digitale, dark preview, vCard foto + telefono
- Fix preview immagini Google Drive
- Fix icona Euro al posto di Dollaro nella pagina progetti

---

## [0.5.0] - 2026-02-14

### Nuove Funzionalit&agrave;

#### Cartelle = Sottoprogetti
- **File separati per cartella** - Ogni cartella ha ora i propri file, con upload e visualizzazione filtrati
- **Chat separata per cartella** - Ogni cartella ha un canale chat dedicato, creato automaticamente
- **Tutti i tab filtrati** - Selezionando una cartella, Board, File e Chat mostrano solo i dati di quella cartella
- **Archiviazione pulita** - Eliminando una cartella, il canale chat viene archiviato e file/task tornano al progetto padre

#### Chat & Badge
- **Badge totale messaggi non letti** - La sidebar mostra il numero totale di messaggi non letti (non pi&ugrave; il conteggio canali)
- **Conteggio per canale/DM** - Ogni canale e messaggio diretto mostra il badge numerico (es. "3", "12", "99+")

### Bug Fix

- **HTML entities nei messaggi** - Rimosso escaping di `'` e `"` che causava `&#x27;` e `&quot;` visibili nel testo
- **Dati DB corretti** - Fix SQL per decodificare entities gi&agrave; salvate nei messaggi esistenti

### Modifiche Tecniche

- Schema Prisma: `folderId` opzionale aggiunto a `ProjectAttachment` e `ChatChannel`
- Relazioni inverse `attachments[]` e `chatChannels[]` su model `Folder`
- API channels: campo `unreadCount` nella risposta GET
- API attachments: supporto filtro e upload per `folderId`
- API project chat: supporto query param `folderId` per canale cartella
- API folders POST/DELETE: gestione automatica canale chat

---

## [0.4.0] - 2026-01-28

### Nuove Funzionalit&agrave;

#### Modulo Commerciale Completo
- **Template preventivi** - Modelli riutilizzabili con voci predefinite, personalizzazione colori/logo
- **Fatturazione elettronica** - FatturaPA/SDI con generazione XML, tracking stato, log
- **Firma OTP** - Richiesta firma digitale con OTP via email, audit trail completo
- **Wizard commerciale** - Form multi-step personalizzabili per raccolta dati clienti
- **PDF professionali** - Generazione PDF preventivi con template personalizzati

#### Editing Inline
- **Preventivi editabili** - Modifica inline voci, importi, note, date validit&agrave;
- **Fatture editabili** - Modifica stato, date pagamento, metodo pagamento
- **Settings migliorata** - Gestione profilo aziendale, dati fiscali, logo

#### Sicurezza & Accesso
- **Visibilit&agrave; progetti** - Progetti visibili solo ai membri assegnati
- **Cartellino presenze** - Tracciamento automatico clock-in/clock-out basato su heartbeat

### Bug Fix
- Fix upload file e CSP headers
- Fix logout improvviso da race condition token refresh
- Fix notifiche chiamata Meet senza channelId
- Fix badge chat aggiornamento istantaneo dopo lettura
- Fix request.ip non supportato in Next.js 16

---

## [0.3.0] - 2026-01-15

### Nuove Funzionalit&agrave;

#### Push Notifications & PWA
- **Push notifications** - Notifiche push per chat, assegnazioni task, commenti (PWA + iOS Safari)
- **Service Worker** - Background sync per notifiche offline
- **Badge accurato** - Conteggio unread sincronizzato con server

#### Admin & Team
- **Impersonificazione** - Admin pu&ograve; navigare come qualsiasi utente per debug
- **Username unico** - Campo username per ogni utente
- **Activity log** - Pagina attivit&agrave; con filtri per tipo, utente, data e paginazione
- **Tracciamento IP** - Registrazione IP ultimo login
- **Team page** - Dati reali con stato attivit&agrave; e ultimo accesso specifico

#### Visual Overhaul
- **Design system rinnovato** - Tabelle, card, badge, form, pagine chiave
- **Miglioramento 173 file** - Refactoring completo UI/UX con 6 agenti paralleli

### Bug Fix
- Fix notifiche mobile (onOpenNotifications era noop)
- Fix backward-compatible API per risorse singole
- Fix refresh token collisions con jti claim + auto-cleanup
- Fix lazy-load SIGNATURE_SECRET per Docker build
- Fix compatibilit&agrave; endpoint API con alias `items`

---

## [0.2.0] - 2026-02-11

### Nuove Funzionalit&agrave;

#### Chat
- **Chat privata (DM)** - Messaggi diretti tra membri del team
- **Chat interna ai progetti** - Canale chat dedicato per ogni progetto
- **Emoji picker** - Griglia di 40 emoji comuni
- **Invio file/immagini** - Upload file in chat con preview immagini inline
- **Modifica/eliminazione messaggi** - Menu contestuale sui propri messaggi
- **Rich text rendering** - Link cliccabili, **bold**, *italic*, `code`
- **Creazione canali** - Canali pubblici, privati e DM con selezione membri

#### ERP & Finanze
- **Nuovo cliente nei preventivi** - Modale inline per creare cliente durante generazione preventivo
- **Icona Finanze** - Simbolo Euro nella sidebar e bottom nav

#### Task & Progetti
- **Fix assegnazione task** - Dropdown assegnazione corretto (API response mismatch)
- **Allegati file nei task** - Upload e preview nel dettaglio task
- **Modello TaskAttachment** - Gestione allegati task in Prisma

#### Notifiche
- **Sistema notifiche completo** - Polling 30s, mark-as-read singolo e multiplo
- **Notifiche cliccabili** - Click naviga al link correlato
- **Conteggio unread** - Badge accurato nella topbar

#### Gestione Utenti & Team
- **Invito nuovi utenti** - Form con password temporanea e copia clipboard
- **Modifica ruolo** - Select inline (solo Admin/Manager)
- **Attivazione/disattivazione** - Toggle con protezione auto-disattivazione
- **Ricerca e filtri** - Per nome/email e per ruolo

#### Google Meet
- **Quick Meet** - Invito automatico partecipanti, durata personalizzabile
- **Card Meet in chat** - Link Meet come card interattive
- **Meet ovunque** - Bottone nella Topbar, Team e pagina Progetto

#### UI & Layout
- **Sidebar full-height** - Fix spazio bianco
- **Loghi light/dark** - Componente Logo con varianti auto
- **Favicon premium** - SVG con gradiente gold

### Bug Fix
- Fix logout automatico (refresh token proattivo ogni 12 min + on tab focus)
- Fix assegnazione task (mismatch API response)
- Fix notifiche (campo `readAt` → `isRead`)
- Fix divider sidebar (opacity CSS)

---

## [0.1.0] - 2026-02-10

### Release Iniziale

- Dashboard con grafici fatturato e pipeline
- CRM completo (clienti, contatti, interazioni, pipeline kanban, leads)
- Project Management (progetti, task, milestone, Gantt, Kanban, time tracking)
- ERP (preventivi, fatture, spese, report, fatturazione elettronica)
- Knowledge Base (wiki con versioning, commenti, categorie)
- Content Management (libreria asset, review workflow, social scheduling)
- Supporto (ticketing con SLA, commenti)
- Chat team (canali, SSE real-time, @menzioni)
- Calendario (integrazione Google Calendar, eventi, Meet)
- Autenticazione (JWT, refresh token, RBAC, Google OAuth)
- Portal clienti (preventivi, progetti, documenti, ticket)
- Ricerca globale (Command Palette Cmd+K)
- PWA (service worker, manifest, installabile)
- Temi (light, dark, midnight)
