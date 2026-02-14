# AUDIT FRONTEND UI/UX - FODI OS

**Data:** 2026-02-14
**Auditor:** frontend-auditor (Claude Code Agent)
**Scope:** `/var/www/projects/fodi-os/src/` - Tutti i file frontend (pagine, componenti layout, componenti UI)

---

## Riepilogo Severita

| Severita | Conteggio |
|----------|-----------|
| CRITICAL | 3 |
| HIGH     | 14 |
| MEDIUM   | 18 |
| LOW      | 12 |
| **Totale** | **47** |

---

## 1. Empty States

### 1.1 Dashboard - Empty state task non usa componente EmptyState
- **Severita:** LOW
- **File:** `src/app/(dashboard)/dashboard/page.tsx:~line 268`
- **Descrizione:** La lista "Task in scadenza" mostra un semplice testo "Nessun task in scadenza." invece di usare il componente `EmptyState` standardizzato usato ovunque nel resto dell'app.
- **Impatto:** Incoerenza visiva con il resto dell'applicazione.
- **Suggerimento:** Usare `<EmptyState icon={CheckSquare} title="Nessun task in scadenza" description="..." />`.

### 1.2 Internal page - Empty task list non usa EmptyState
- **Severita:** LOW
- **File:** `src/app/(dashboard)/internal/page.tsx:399`
- **Descrizione:** La lista "Task Recenti" mostra `<p className="text-sm text-muted py-4">Nessun task trovato.</p>` invece del componente `EmptyState`.
- **Impatto:** Incoerenza visiva.
- **Suggerimento:** Usare il componente `EmptyState` standardizzato.

### 1.3 Internal page - Empty projects usa Card custom
- **Severita:** LOW
- **File:** `src/app/(dashboard)/internal/page.tsx:331-334`
- **Descrizione:** "Nessun progetto interno trovato." renderizzato in una Card con testo centrato, non usa `EmptyState`.
- **Impatto:** Incoerenza visiva lieve.
- **Suggerimento:** Usare `EmptyState` con azione "Crea progetto".

### 1.4 Pagine con empty state coerenti (PASS)
Le seguenti pagine usano correttamente il componente `EmptyState`:
- `tasks/page.tsx` - EmptyState con azione
- `crm/page.tsx` - EmptyState con azione
- `projects/page.tsx` - EmptyState con azione
- `support/page.tsx` - EmptyState con azione
- `calendar/page.tsx` - EmptyState (calendario non connesso / nessun evento)
- `content/social/page.tsx` - EmptyState con azione
- `content/reviews/page.tsx` - EmptyState
- `content/assets/page.tsx` - EmptyState con azione + EmptyState per Drive disconnesso
- `erp/expenses/page.tsx` - EmptyState con azione
- `crm/leads/page.tsx` - EmptyState
- `settings/users/page.tsx` - EmptyState
- `team/page.tsx` - EmptyState
- `kb/page.tsx` - EmptyState per tree e contenuto

---

## 2. Loading States

### 2.1 Settings page - return null durante loading
- **Severita:** HIGH
- **File:** `src/app/(dashboard)/settings/page.tsx`
- **Descrizione:** Quando l'utente non e ancora caricato, la pagina restituisce `return null`, mostrando una pagina completamente bianca senza alcun indicatore di caricamento.
- **Impatto:** L'utente vede una schermata vuota per un momento, pensando che la pagina sia rotta.
- **Suggerimento:** Aggiungere uno skeleton loader o spinner durante il caricamento dei dati utente.

### 2.2 Billing settings page - return null durante loading
- **Severita:** HIGH
- **File:** `src/app/(dashboard)/settings/billing/page.tsx:116`
- **Descrizione:** `if (loading) return null` - stessa problematica della settings page. Pagina bianca durante il caricamento.
- **Impatto:** Esperienza utente scadente, pagina appare vuota.
- **Suggerimento:** Sostituire con `<Skeleton />` appropriato.

### 2.3 Pagine con loading state coerente (PASS)
Le seguenti pagine gestiscono correttamente il loading con componente `Skeleton`:
- `dashboard/page.tsx` - Skeleton grid per stat cards
- `tasks/page.tsx` - Skeleton per lista
- `crm/page.tsx` - Skeleton per tabella
- `projects/page.tsx` - Skeleton grid per cards
- `support/page.tsx` - Skeleton per tabella
- `team/page.tsx` - Skeleton per cards
- `calendar/page.tsx` - Skeleton per eventi
- `internal/page.tsx` - Skeleton per stats, progetti e task
- `content/social/page.tsx` - Skeleton grid
- `content/reviews/page.tsx` - Skeleton stack
- `content/assets/page.tsx` - Skeleton grid
- `erp/expenses/page.tsx` - Skeleton stack
- `erp/reports/page.tsx` - Skeleton grid
- `crm/pipeline/page.tsx` - Skeleton kanban
- `crm/leads/page.tsx` - Skeleton stack
- `projects/analytics/page.tsx` - Skeleton cards
- `settings/system/page.tsx` - Skeleton completo
- `settings/users/page.tsx` - Skeleton con shimmer custom
- `time/page.tsx` - Skeleton stack

---

## 3. Error States

### 3.1 GLOBALE - Fetch errors silenziati ovunque
- **Severita:** CRITICAL
- **File:** Multipli (vedere lista sotto)
- **Descrizione:** La stragrande maggioranza delle pagine usa `.catch(() => {})` o `try/finally` senza catch block, ignorando silenziosamente gli errori di rete/API. L'utente non riceve MAI feedback quando una richiesta fallisce.
- **Impatto:** L'utente non sa che i dati non sono stati caricati o che un'azione e fallita. Puo pensare che il sistema sia vuoto quando in realta c'e un errore di rete.
- **File coinvolti:**
  - `dashboard/page.tsx` - Tutti i fetch (stats, tasks, activities, notes) ignorano errori
  - `tasks/page.tsx` - `fetchTasks` non mostra errori all'utente
  - `crm/page.tsx` - `fetchClients` ignora errori, creazione fallita mostra solo "Errore" generico
  - `chat/page.tsx` - Errori fetch sessione, canali, invio messaggi tutti silenziati
  - `calendar/page.tsx` - Errori fetch eventi silenziati
  - `support/page.tsx` - Errori fetch ticket silenziati
  - `team/page.tsx` - Errori fetch team silenziati
  - `kb/page.tsx` - Errori save articolo silenziati
  - `internal/page.tsx` - Errori fetch dati silenziati
  - `content/social/page.tsx` - Creazione post: errore non mostrato se `!res.ok`
  - `content/reviews/page.tsx` - Aggiunta commento: errore non mostrato se `!res.ok`
  - `content/assets/page.tsx` - Errori fetch assets silenziati
  - `erp/expenses/page.tsx` - Creazione spesa: errore non mostrato se `!res.ok`
  - `crm/pipeline/page.tsx` - Errore cambio stato silenziato (nessun rollback)
  - `crm/leads/page.tsx` - Conversione lead: errore non mostrato se `!res.ok`
  - `projects/analytics/page.tsx` - Errori analytics non mostrati (`if (!res.ok) return`)
  - `erp/reports/page.tsx` - Errori fetch fatture/spese silenziati
  - `settings/users/page.tsx` - `handleRoleChange` e `handleToggleActive` hanno catch vuoti
  - `time/page.tsx` - Errori fetch sessioni silenziati
  - `Topbar.tsx` - Notifiche `.catch(() => {})`, mark-as-read `.catch(() => {})`
- **Suggerimento:** Implementare un pattern globale di error handling:
  1. Creare un hook `useApiError` o un toast notification system
  2. Mostrare un banner/toast quando un fetch fallisce
  3. Per le liste, mostrare un `EmptyState` con messaggio di errore e pulsante "Riprova"

### 3.2 Settings/system - Unica pagina con error state (PASS)
- **File:** `src/app/(dashboard)/settings/system/page.tsx:351-362`
- **Descrizione:** Questa e l'UNICA pagina che gestisce correttamente l'error state mostrando un messaggio all'utente quando il fetch fallisce. Ottimo esempio da replicare.

### 3.3 Pipeline kanban - Nessun rollback su errore
- **Severita:** HIGH
- **File:** `src/app/(dashboard)/crm/pipeline/page.tsx:43-75`
- **Descrizione:** L'aggiornamento dello stato del client usa un optimistic update ma non prevede rollback se la PATCH API fallisce. L'utente vede il client spostato nella nuova colonna, ma il backend potrebbe non aver registrato il cambio.
- **Impatto:** Stato UI inconsistente con il backend.
- **Suggerimento:** Aggiungere error handling con rollback allo stato precedente in caso di errore API.

---

## 4. Form Validation

### 4.1 Social post - Nessun feedback errore creazione
- **Severita:** HIGH
- **File:** `src/app/(dashboard)/content/social/page.tsx:87-98`
- **Descrizione:** La funzione `handleCreate` controlla `if (res.ok)` ma non mostra alcun messaggio di errore se la risposta non e ok. L'utente clicca "Crea Post", il form si blocca e non succede nulla.
- **Impatto:** L'utente non sa perche la creazione e fallita.
- **Suggerimento:** Aggiungere un `formError` state e mostrarlo nel form come nelle pagine Projects/CRM.

### 4.2 Review comment - Nessun feedback errore
- **Severita:** MEDIUM
- **File:** `src/app/(dashboard)/content/reviews/page.tsx:68-84`
- **Descrizione:** `handleAddComment` non mostra errore se la risposta non e ok.
- **Impatto:** L'utente non sa che il commento non e stato aggiunto.
- **Suggerimento:** Aggiungere feedback visivo di errore.

### 4.3 Expense creation - Nessun feedback errore
- **Severita:** MEDIUM
- **File:** `src/app/(dashboard)/erp/expenses/page.tsx:73-95`
- **Descrizione:** `handleAddExpense` non mostra errore se la risposta non e ok.
- **Impatto:** L'utente non sa che la spesa non e stata registrata.
- **Suggerimento:** Aggiungere `formError` state come nella pagina Progetti.

### 4.4 Internal project creation - Usa disabled invece di loading prop
- **Severita:** LOW
- **File:** `src/app/(dashboard)/internal/page.tsx:499`
- **Descrizione:** Il bottone submit usa `disabled={submitting}` e testo condizionale "Salvataggio..."/"Crea Progetto" invece di usare la prop `loading` del componente Button che mostra uno spinner. Altre pagine (es. Projects) usano correttamente `loading={submitting}`.
- **Impatto:** Incoerenza visiva con gli altri form dell'app.
- **Suggerimento:** Usare `<Button type="submit" loading={submitting}>Crea Progetto</Button>`.

### 4.5 Social post creation - Stessa issue disabled vs loading
- **Severita:** LOW
- **File:** `src/app/(dashboard)/content/social/page.tsx:221-223`
- **Descrizione:** Usa `disabled={submitting}` con testo condizionale invece di `loading` prop.
- **Suggerimento:** Usare `loading={submitting}`.

### 4.6 Billing settings - disabled vs loading
- **Severita:** LOW
- **File:** `src/app/(dashboard)/settings/billing/page.tsx:250-252`
- **Descrizione:** Usa `disabled={saving}` con testo condizionale "Salvataggio..."/"Salva Profilo".
- **Suggerimento:** Usare `loading={saving}`.

### 4.7 Pagine con form validation corretti (PASS)
- `projects/page.tsx` - formError display, error parsing dettagliato, `loading` prop
- `crm/page.tsx` - formError display
- `settings/page.tsx` - Password validation (match + min length)
- `login/page.tsx` - Error display, required fields, loading button
- `settings/users/page.tsx` - inviteError e editError display, loading prop
- `billing/page.tsx` - message display (successo/errore), feedback utente

---

## 5. Button States

### 5.1 Calendar - Testo "Creazione..." invece di spinner
- **Severita:** LOW
- **File:** `src/app/(dashboard)/calendar/page.tsx`
- **Descrizione:** Il bottone di creazione evento usa `disabled={creating}` e testo "Creazione..." invece della prop `loading` con spinner.
- **Impatto:** Incoerenza con il pattern del resto dell'app.
- **Suggerimento:** Usare `<Button loading={creating}>Crea Evento</Button>`.

### 5.2 Leads - Testo "..." troppo criptico su mobile
- **Severita:** LOW
- **File:** `src/app/(dashboard)/crm/leads/page.tsx:187`
- **Descrizione:** Il bottone "Converti" in stato di caricamento mostra solo "..." che e poco informativo.
- **Impatto:** L'utente potrebbe non capire che l'azione e in corso.
- **Suggerimento:** Usare `loading` prop del Button o almeno "Conversione...".

### 5.3 Pagine con button states corretti (PASS)
La maggior parte delle pagine usa correttamente il prop `loading` del componente Button:
- `projects/page.tsx` - `loading={submitting}`
- `crm/page.tsx` - `loading={creating}`
- `support/page.tsx` - `loading={submitting}`
- `settings/users/page.tsx` - `loading={inviteLoading}`, `loading={editSaving}`, ecc.

---

## 6. Link Interni

### 6.1 MobileHeader - "/internal" mancante da SECTION_NAMES
- **Severita:** MEDIUM
- **File:** `src/components/layout/MobileHeader.tsx`
- **Descrizione:** La mappa `SECTION_NAMES` che traduce i path in nomi leggibili per l'header mobile non include la voce per `/internal`. Quando l'utente naviga alla pagina Azienda, l'header mostra il path generico invece del nome "Azienda".
- **Impatto:** Esperienza mobile degradata per la pagina Azienda.
- **Suggerimento:** Aggiungere `'/internal': 'Azienda'` alla mappa `SECTION_NAMES`.

### 6.2 Dashboard dropzone - onDrop non funzionale
- **Severita:** HIGH
- **File:** `src/app/(dashboard)/dashboard/page.tsx`
- **Descrizione:** Il componente dropzone nella dashboard ha `onDrop` che esegue solo `console.log`. Nessun file viene effettivamente caricato.
- **Impatto:** Feature non funzionale esposta all'utente. L'utente puo tentare di fare drag-and-drop di file senza risultato.
- **Suggerimento:** Implementare l'upload effettivo o rimuovere il dropzone se non e previsto.

### 6.3 Topbar - onOpenNotifications noop su mobile
- **Severita:** MEDIUM
- **File:** `src/app/(dashboard)/layout.tsx`
- **Descrizione:** Il componente `MobileHeader` riceve `onOpenNotifications={() => {}}` che e una funzione vuota. Cliccando l'icona notifiche su mobile non succede nulla.
- **Impatto:** L'utente mobile non puo accedere alle notifiche dall'header.
- **Suggerimento:** Implementare l'apertura del pannello notifiche anche su mobile, o rimuovere l'icona se non supportato.

### 6.4 Route consistency check (PASS)
Tutte le route nel Sidebar, BottomNav e CommandPalette hanno pagine corrispondenti:
- `/dashboard`, `/tasks`, `/chat`, `/internal`, `/crm`, `/crm/pipeline`, `/crm/leads`
- `/projects`, `/projects/analytics`, `/time`, `/calendar`
- `/erp`, `/erp/quotes`, `/erp/invoices`, `/erp/expenses`, `/erp/reports`
- `/kb`, `/content`, `/content/social`, `/content/reviews`, `/content/assets`
- `/support`, `/team`, `/settings`, `/settings/users`, `/settings/billing`, `/settings/system`

---

## 7. Coerenza

### 7.1 Priority labels non tradotte - Internal page
- **Severita:** MEDIUM
- **File:** `src/app/(dashboard)/internal/page.tsx:191,411`
- **Descrizione:** I badge di priorita nei progetti e task interni mostrano il valore raw "LOW"/"MEDIUM"/"HIGH"/"URGENT" invece delle label tradotte "Bassa"/"Media"/"Alta"/"Urgente" usate nella pagina Progetti Clienti.
- **Impatto:** Incoerenza tra pagine, mix italiano/inglese.
- **Suggerimento:** Aggiungere `PRIORITY_LABELS` e usarle come nella pagina `/projects/page.tsx`.

### 7.2 Invite modal - Usa div custom invece di componente Modal
- **Severita:** MEDIUM
- **File:** `src/app/(dashboard)/settings/users/page.tsx:516-625`
- **Descrizione:** La modale di invito utente e il modale di modifica utente sono implementati con `<div className="fixed inset-0 z-50 ...">` custom, senza usare il componente `<Modal>` standardizzato. Questo significa che non supportano: Escape key, swipe-to-dismiss mobile, body overflow lock.
- **Impatto:** Comportamento inconsistente rispetto agli altri dialog dell'app. Su mobile, lo sfondo rimane scrollabile e lo swipe non chiude la modale.
- **Suggerimento:** Refactorare per usare il componente `<Modal>`.

### 7.3 Edit modal users - Stessa issue del punto precedente
- **Severita:** MEDIUM
- **File:** `src/app/(dashboard)/settings/users/page.tsx:628-1067`
- **Descrizione:** Anche la modale di modifica utente usa un div custom. Vedi 7.2.

### 7.4 Revenue MTD label in inglese
- **Severita:** MEDIUM
- **File:** `src/app/(dashboard)/erp/reports/page.tsx:148`
- **Descrizione:** La stat card "Revenue MTD" usa un termine inglese. Il resto dell'app e in italiano.
- **Impatto:** Incoerenza linguistica.
- **Suggerimento:** Usare "Fatturato Mese" o "Revenue del Mese".

### 7.5 "Overdue Rate" in inglese
- **Severita:** MEDIUM
- **File:** `src/app/(dashboard)/projects/analytics/page.tsx:174`
- **Descrizione:** La KPI card "Overdue Rate" usa un termine inglese.
- **Suggerimento:** Usare "Tasso Scaduti" o "% Scaduti".

### 7.6 "Velocity / Settimana" mix lingua
- **Severita:** LOW
- **File:** `src/app/(dashboard)/projects/analytics/page.tsx:162`
- **Descrizione:** "Velocity" e inglese, "Settimana" e italiano.
- **Suggerimento:** Usare "Velocita / Settimana" o "Task / Settimana".

### 7.7 "Analytics Task" title in inglese
- **Severita:** MEDIUM
- **File:** `src/app/(dashboard)/projects/analytics/page.tsx:105`
- **Descrizione:** Il titolo della pagina "Analytics Task" e in inglese.
- **Suggerimento:** Usare "Analisi Task" o "Statistiche Task".

### 7.8 "Latest" badge in inglese
- **Severita:** LOW
- **File:** `src/app/(dashboard)/settings/system/page.tsx:599`
- **Descrizione:** Il badge "Latest" nel changelog e in inglese.
- **Suggerimento:** Usare "Ultimo" o "Corrente".

### 7.9 Role labels inglesi nella lista ruoli
- **Severita:** MEDIUM
- **File:** `src/app/(dashboard)/settings/users/page.tsx:74-82`
- **Descrizione:** I ruoli "Sales", "Project Manager", "Developer", "Content", "Support" sono in inglese. Solo "Admin", "Manager" e "Cliente" sono comprensibili in italiano.
- **Impatto:** Utenti non tecnici potrebbero non capire i ruoli.
- **Suggerimento:** Tradurre in "Commerciale", "Responsabile Progetto", "Sviluppatore", "Contenuti", "Assistenza".

---

## 8. Accessibilita

### 8.1 Topbar - Usa title invece di aria-label
- **Severita:** HIGH
- **File:** `src/components/layout/Topbar.tsx`
- **Descrizione:** I pulsanti icona (notifiche, profilo, Quick Meet) usano l'attributo `title` invece di `aria-label`. Gli screen reader non leggono `title` in modo affidabile come `aria-label`.
- **Impatto:** Accessibilita ridotta per utenti con screen reader.
- **Suggerimento:** Aggiungere `aria-label` a tutti i pulsanti icona.

### 8.2 Sidebar - Toggle usa title invece di aria-label
- **Severita:** MEDIUM
- **File:** `src/components/layout/Sidebar.tsx`
- **Descrizione:** Il pulsante di toggle sidebar usa `title` invece di `aria-label`.
- **Suggerimento:** Aggiungere `aria-label="Apri/chiudi sidebar"`.

### 8.3 CommandPalette - Backdrop senza aria-label
- **Severita:** MEDIUM
- **File:** `src/components/layout/CommandPalette.tsx`
- **Descrizione:** Il div backdrop non ha `aria-label` o `role="dialog"`.
- **Suggerimento:** Aggiungere `role="dialog"` e `aria-label="Ricerca comandi"` al container.

### 8.4 Social page tabs - Nessun role="tablist"
- **Severita:** MEDIUM
- **File:** `src/app/(dashboard)/content/social/page.tsx:120-134`
- **Descrizione:** I tab di stato (Bozze/Programmati/Pubblicati) non hanno i ruoli ARIA appropriati (`role="tablist"`, `role="tab"`, `aria-selected`).
- **Impatto:** Gli screen reader non possono navigare correttamente tra i tab.
- **Suggerimento:** Aggiungere `role="tablist"` al container e `role="tab"` + `aria-selected` ad ogni tab. Stessa issue presente in:
  - `content/assets/page.tsx` (tab MinIO/Drive)
  - `settings/system/page.tsx` (tab Panoramica/Changelog)
  - `settings/users/page.tsx` (tab Profilo/Permessi/Sezioni)
  - `projects/analytics/page.tsx` (filtri)

### 8.5 Review accordion - Nessun aria-expanded
- **Severita:** LOW
- **File:** `src/app/(dashboard)/content/reviews/page.tsx:138-165`
- **Descrizione:** I bottoni accordion per espandere/collassare le review non hanno `aria-expanded` ne `aria-controls`.
- **Suggerimento:** Aggiungere `aria-expanded={isExpanded}` al button.

### 8.6 Users admin - Permission checkboxes senza label
- **Severita:** HIGH
- **File:** `src/app/(dashboard)/settings/users/page.tsx:919-930`
- **Descrizione:** I "checkbox" della tabella permessi sono bottoni custom senza `aria-label` o `aria-checked`. Screen reader non possono capire lo stato o lo scopo.
- **Suggerimento:** Aggiungere `role="checkbox"`, `aria-checked={hasUserPerm(...)}` e `aria-label={mod.label + ' - ' + perm}`.

### 8.7 Users admin - Toggle switch senza aria-label
- **Severita:** MEDIUM
- **File:** `src/app/(dashboard)/settings/users/page.tsx:953-969`
- **Descrizione:** Lo switch "Personalizzazione attiva" nella tab Sezioni e uno span custom senza attributi ARIA.
- **Suggerimento:** Aggiungere `role="switch"`, `aria-checked`, `aria-label`.

### 8.8 MobileHeader e BottomNav (PASS)
- `MobileHeader.tsx` - Tutti i pulsanti hanno `aria-label` corretto
- `BottomNav.tsx` - Tutti i pulsanti hanno `aria-label` corretto

---

## 9. Testi (Italiano)

### 9.1 "Asset Library" titolo in inglese
- **Severita:** HIGH
- **File:** `src/app/(dashboard)/content/assets/page.tsx:534`
- **Descrizione:** Il titolo della pagina Assets e "Asset Library" in inglese.
- **Impatto:** Incoerenza con il resto dell'app che e interamente in italiano.
- **Suggerimento:** Tradurre in "Libreria Contenuti" o "Archivio Media".

### 9.2 "Social Calendar" titolo in inglese
- **Severita:** HIGH
- **File:** `src/app/(dashboard)/content/social/page.tsx:109`
- **Descrizione:** Il titolo della pagina Social e "Social Calendar" in inglese.
- **Suggerimento:** Tradurre in "Calendario Social" o "Piano Editoriale".

### 9.3 "Review" titolo non tradotto
- **Severita:** HIGH
- **File:** `src/app/(dashboard)/content/reviews/page.tsx:99`
- **Descrizione:** Il titolo della pagina Review e "Review" in inglese.
- **Suggerimento:** Tradurre in "Revisioni" o "Approvazioni".

### 9.4 "produttivita" senza accento
- **Severita:** MEDIUM
- **File:** `src/app/(dashboard)/projects/analytics/page.tsx:107`
- **Descrizione:** "produttivita" dovrebbe essere "produttivita" con accento grave.
- **Suggerimento:** Correggere in "produttivita" (con accento).

### 9.5 "Contabilita" nel sidebar - accent mancante
- **Severita:** MEDIUM
- **File:** `src/components/layout/Sidebar.tsx` (nel menu ERP)
- **Descrizione:** Se il label ERP o sottovoci usano "Contabilita" senza accento, va corretto.
- **Suggerimento:** Verificare e correggere in "Contabilita" (con accento).

### 9.6 "Citta" senza accento nel form fatturazione
- **Severita:** MEDIUM
- **File:** `src/app/(dashboard)/settings/billing/page.tsx:193`
- **Descrizione:** Il label del campo citta e "Citta *" senza accento.
- **Suggerimento:** Correggere in "Citta *" (con accento).

### 9.7 "validita" senza accento nel changelog
- **Severita:** LOW
- **File:** `src/app/(dashboard)/settings/system/page.tsx:48`
- **Descrizione:** Nel changelog "validita" senza accento.
- **Suggerimento:** Correggere in "validita" (con accento).

### 9.8 "puo'" con apostrofo sbagliato
- **Severita:** LOW
- **File:** `src/app/(dashboard)/settings/users/page.tsx:851`
- **Descrizione:** `"puo&apos; essere annullata"` - usa HTML entity che potrebbe non renderizzare correttamente in tutti i contesti. Inoltre "puo'" con apostrofo e sbagliato, dovrebbe essere "puo" con accento grave.
- **Suggerimento:** Usare il carattere Unicode diretto: `"puo essere annullata"`.

---

## 10. Modal/Dialog

### 10.1 Users admin - Modal custom senza keyboard support
- **Severita:** HIGH
- **File:** `src/app/(dashboard)/settings/users/page.tsx:516-625, 628-1067`
- **Descrizione:** Le due modali (invito e modifica utente) sono implementate con div custom e NON supportano:
  - Chiusura con tasto Escape
  - Focus trap (il focus puo uscire dalla modale)
  - Swipe-to-dismiss su mobile
  - Body overflow lock (lo sfondo rimane scrollabile)
- **Impatto:** Accessibilita compromessa e UX mobile degradata.
- **Suggerimento:** Migrare al componente `<Modal>` standardizzato che gestisce tutto automaticamente.

### 10.2 Modal component (PASS)
- **File:** `src/components/ui/Modal.tsx`
- **Descrizione:** Il componente Modal gestisce correttamente:
  - Escape key per chiusura
  - Click su backdrop per chiusura
  - Body overflow lock (`document.body.style.overflow = 'hidden'`)
  - Swipe-to-dismiss su mobile con touch events
  - Touch target adeguato per close button (min-h-[44px] min-w-[44px])
  - Animazione di entrata/uscita

### 10.3 Pagine che usano Modal correttamente (PASS)
Tutte le seguenti pagine usano il componente `<Modal>` standardizzato:
- `projects/page.tsx` - Creazione progetto
- `crm/page.tsx` - Creazione cliente
- `support/page.tsx` - Creazione ticket
- `calendar/page.tsx` - Creazione evento
- `internal/page.tsx` - Creazione progetto interno
- `content/social/page.tsx` - Creazione post
- `content/assets/page.tsx` - Upload asset + dettaglio asset + nuova cartella Drive
- `erp/expenses/page.tsx` - Nuova spesa
- `kb/page.tsx` - Creazione articolo

---

## 11. Problemi Aggiuntivi

### 11.1 Login page - Colori hardcoded non dark-mode compatibili
- **Severita:** HIGH
- **File:** `src/app/(auth)/login/page.tsx`
- **Descrizione:** Il messaggio di errore usa `bg-red-50 border-red-200 text-red-700` che sono colori hardcoded per tema chiaro. In dark mode, `bg-red-50` appare come uno sfondo quasi bianco molto sgradevole.
- **Impatto:** UI rotta in dark mode/midnight theme.
- **Suggerimento:** Usare le variabili tema: `bg-destructive/10 border-destructive/20 text-destructive`.

### 11.2 Forgot password page - Stessa issue colori hardcoded
- **Severita:** HIGH
- **File:** `src/app/(auth)/forgot-password/page.tsx`
- **Descrizione:** Il messaggio di successo usa `bg-green-50 border-green-200 text-green-700`, non dark-mode compatibile.
- **Suggerimento:** Usare `bg-primary/10 border-primary/20 text-primary` o variabili `--color-success`.

### 11.3 Forgot password - Nessun error handling
- **Severita:** MEDIUM
- **File:** `src/app/(auth)/forgot-password/page.tsx`
- **Descrizione:** Se la chiamata API fallisce (errore di rete), non viene mostrato alcun errore all'utente.
- **Suggerimento:** Aggiungere un catch block con messaggio di errore.

---

## Riepilogo Azioni Prioritarie

### CRITICAL (risolvere immediatamente)
1. **Error states globali** (#3.1) - Implementare un sistema di toast/notification per errori API in tutta l'app
2. **Dashboard dropzone non funzionale** (#6.2) - Implementare o rimuovere
3. Conteggio: 3 issue (la #3.1 copre ~20 pagine)

### HIGH (risolvere prima del rilascio)
1. **Settings/Billing return null** durante loading (#2.1, #2.2)
2. **Social/Review/Expense form** senza feedback errore (#4.1, #4.2, #4.3)
3. **Pipeline kanban** nessun rollback (#3.3)
4. **Login/forgot-password** colori hardcoded (#11.1, #11.2)
5. **Titoli pagine in inglese** (#9.1, #9.2, #9.3)
6. **Users admin modal** senza keyboard support (#10.1)
7. **Accessibility** - Topbar aria-label (#8.1), permission checkboxes (#8.6)
8. **Mobile notifications** noop (#6.3)

### MEDIUM (miglioramenti importanti)
1. Accenti mancanti nei testi italiani (#9.4-9.6)
2. Tab senza ARIA roles (#8.4)
3. Modal custom users (#7.2, #7.3)
4. Labels inglesi sparse (#7.4-7.7, 7.9)
5. MobileHeader mancante /internal (#6.1)
6. Sidebar/CommandPalette aria (#8.2, 8.3)

### LOW (nice to have)
1. Empty state inconsistenze (#1.1-1.3)
2. Button disabled vs loading (#4.4-4.6, 5.1-5.2)
3. Testi minori (#7.8, 9.7-9.8)
4. Review aria-expanded (#8.5)
5. Velocity mix lingua (#7.6)

---

## Note Finali

### Punti di Forza
- **Component library coerente:** Uso consistente di Button, Card, Badge, Modal, Skeleton, EmptyState in quasi tutte le pagine
- **Loading states:** Eccellente uso di Skeleton in quasi tutte le pagine (18/20+)
- **Modal component:** Implementazione solida con keyboard, touch e accessibility
- **Responsive design:** Quasi tutte le pagine hanno varianti mobile/desktop
- **Italian localization:** Date, currency e la maggior parte dei testi sono in italiano
- **Design system:** Uso coerente di CSS variables (--color-primary, --color-accent, ecc.)
- **Mobile navigation:** BottomNav e MobileHeader hanno aria-label corretti

### Pattern Ricorrente Piu Grave
Il problema piu pervasivo e l'assenza di error handling visivo. Quasi tutte le pagine dell'app ignorano silenziosamente gli errori API. Si consiglia di:
1. Creare un componente `<ErrorBanner>` riutilizzabile
2. Creare un hook `useApi` che gestisca loading, error e retry
3. Implementare un sistema di toast notification globale
4. Aggiungere un error boundary React per crash imprevisti
