# Changelog - FODI OS

Tutte le modifiche significative al progetto sono documentate in questo file.

## [0.2.0] - 2026-02-11

### Nuove Funzionalità

#### Chat
- **Chat privata (DM)** - Possibilità di avviare messaggi diretti tra membri del team cliccando sul profilo
- **Chat interna ai progetti** - Ogni progetto ha ora un canale chat dedicato con tab nella pagina progetto
- **Emoji picker** - Pulsante emoji funzionante nella chat con griglia di 40 emoji comuni
- **Invio file/immagini** - Upload file in chat via S3 con preview immagini inline
- **Modifica/eliminazione messaggi** - Menu contestuale sui propri messaggi per editare o eliminare
- **Rich text rendering** - Link cliccabili, **bold**, *italic*, `code` nei messaggi
- **Creazione canali migliorata** - Supporto canali pubblici, privati e messaggi diretti con selezione membri

#### ERP & Finanze
- **Nuovo cliente nei preventivi** - Modale inline per creare un nuovo cliente durante la generazione preventivo
- **Icona Finanze aggiornata** - Sostituita icona Receipt con simbolo Euro nella sidebar e bottom nav

#### Task & Progetti
- **Assegnazione task a staff** - Fix del dropdown assegnazione che non funzionava (API response mismatch)
- **Allegati file nei task** - Upload e visualizzazione allegati con preview nel dettaglio task
- **Modello TaskAttachment** - Nuovo modello Prisma per gestire allegati task

#### Notifiche
- **Sistema notifiche completo** - Fix interfaccia, polling 30s, mark-as-read singolo e multiplo
- **Notifiche cliccabili** - Click sulla notifica naviga al link correlato
- **Conteggio unread** - Badge accurato nella topbar con conteggio dal server

#### Gestione Utenti & Team
- **Invito nuovi utenti** - Form con generazione password temporanea e copia clipboard
- **Modifica ruolo utente** - Select inline per cambiare ruolo (solo Admin/Manager)
- **Attivazione/disattivazione** - Toggle per ogni utente con protezione auto-disattivazione
- **Ricerca e filtri** - Ricerca per nome/email e filtro per ruolo
- **Pagina Team migliorata** - Stato attività (online/offline), ultimo login, filtri per ruolo
- **API gestione utenti** - POST /api/users/invite, PATCH /api/users/[id]

#### Google Meet
- **Quick Meet migliorato** - Invito automatico partecipanti, durata personalizzabile, notifiche
- **API lista meeting** - GET /api/meetings per prossimi meeting con Meet link
- **Card Meet in chat** - Link Google Meet renderizzati come card interattive
- **Quick Meet nella Topbar** - Bottone accessibile da qualsiasi pagina
- **Meet nelle pagine Team/Progetto** - Bottone per avviare meeting rapido

#### UI & Layout
- **Sidebar full-height** - Fix spazio bianco sotto la sidebar (h-screen + flex stretching)
- **Loghi light/dark** - Componente Logo con varianti auto/light/dark basate sul tema
- **Favicon migliorata** - SVG con gradiente gold e background premium
- **Layout responsive** - Miglioramenti al layout mobile e desktop

### Bug Fix

- **Fix logout automatico** - Il sistema faceva logout dopo 15 minuti per mancato refresh del token
  - Middleware ora tenta refresh automatico quando l'access token scade
  - Hook `useAuthRefresh` per refresh proattivo ogni 12 minuti
  - Refresh su tab focus (utente torna dopo assenza)
  - Retry con refresh sulla sessione iniziale
- **Fix assegnazione task** - Il dropdown non caricava gli utenti per mismatch nella risposta API
- **Fix notifiche** - Interfaccia usava campo `readAt` inesistente invece di `isRead`
- **Fix divider sidebar** - Corretto valore opacity CSS non valido

### Miglioramenti Tecnici

- Nuovo hook `useAuthRefresh` per gestione sessione proattiva
- Componente `Logo` riutilizzabile con supporto temi
- API DM chat con deduplicazione canali diretti
- SSE broadcast per messaggi editati/eliminati
- Modello `TaskAttachment` in Prisma schema

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
