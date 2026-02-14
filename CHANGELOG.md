# Changelog - FODI OS

Tutte le modifiche significative al progetto sono documentate in questo file.

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
