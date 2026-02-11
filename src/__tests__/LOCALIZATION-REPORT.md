# Report Audit Localizzazione Italiana - FODI OS

Data: 2026-02-11

## Riepilogo

L'interfaccia utente e in gran parte gia localizzata in italiano. Tuttavia sono stati trovati diversi problemi di localizzazione nelle API responses e alcuni label nella sidebar.

## Problemi Trovati

### 1. API Error Messages in Inglese (ALTA PRIORITA)

**Pattern diffuso:** `'Internal server error'` come fallback in TUTTI i catch handler delle API routes (~80+ occorrenze).
**Impatto:** L'utente potrebbe vedere messaggi in inglese in caso di errore.

**File con messaggi 404 in inglese:**
- `src/app/api/tasks/[taskId]/route.ts` - `'Task not found'`
- `src/app/api/quotes/[quoteId]/route.ts` - `'Quote not found'` (x2)
- `src/app/api/invoices/[invoiceId]/route.ts` - `'Invoice not found'` (x2)
- `src/app/api/invoices/route.ts` - `'Quote not found'`
- `src/app/api/wiki/[pageId]/route.ts` - `'Page not found'` (x2)
- `src/app/api/wiki/[pageId]/comments/route.ts` - `'Page not found'`
- `src/app/api/clients/[clientId]/route.ts` - `'Client not found'`
- `src/app/api/tickets/[ticketId]/route.ts` - `'Ticket not found'`
- `src/app/api/tickets/[ticketId]/comments/route.ts` - `'Ticket not found'`
- `src/app/api/assets/[assetId]/route.ts` - `'Asset not found'` (x2)
- `src/app/api/assets/[assetId]/reviews/route.ts` - `'Asset not found'`
- `src/app/api/projects/[projectId]/route.ts` - `'Project not found'`
- `src/app/api/social/[postId]/route.ts` - `'Post not found'`
- `src/app/api/reviews/[reviewId]/comments/route.ts` - `'Review not found'`
- `src/app/api/portal/quotes/[quoteId]/route.ts` - `'Quote not found'`

**Messaggi 401 in inglese:**
- `src/middleware.ts` - `'Unauthorized'`, `'Token expired or invalid'`
- `src/app/api/drive/files/route.ts` - `'Unauthorized'`
- `src/app/api/drive/upload/route.ts` - `'Unauthorized'`
- `src/app/api/drive/folder/route.ts` - `'Unauthorized'`
- `src/app/api/calendar/route.ts` - `'Unauthorized'`
- `src/app/api/calendar/events/route.ts` - `'Unauthorized'` (x2)
- `src/app/api/team/route.ts` - `'Unauthorized'`
- `src/app/api/auth/google/status/route.ts` - `'Unauthorized'`
- `src/app/api/auth/google/disconnect/route.ts` - `'Unauthorized'`
- `src/app/api/meetings/quick/route.ts` - `'Unauthorized'`

**Messaggi 409/400 in inglese:**
- `src/app/api/wiki/route.ts` - `'A page with this title already exists at this level'`
- `src/app/api/clients/route.ts` - `'A client with this name already exists'`
- `src/app/api/invoices/route.ts` - `'lineItems or quoteId is required'`

**Wiki version note:**
- `src/app/api/wiki/route.ts` - `changeNote: 'Initial version'`

### 2. Label Sidebar in Inglese (MEDIA PRIORITA)

**File:** `src/components/layout/Sidebar.tsx`
- Linea 70: `'Time Tracking'` -> dovrebbe essere `'Tracciamento Ore'`
- Linea 106: `'Asset Library'` -> dovrebbe essere `'Libreria Asset'`
- Linea 107: `'Review'` -> dovrebbe essere `'Revisioni'`
- Linea 108: `'Social'` -> accettabile (termine internazionale)

### 3. RichTextEditor Tooltip in Inglese (BASSA PRIORITA)

**File:** `src/components/shared/RichTextEditor.tsx`
- Linea 111: `title="Heading 1"` -> `"Titolo 1"`
- Linea 118: `title="Heading 2"` -> `"Titolo 2"`
- Linea 125: `title="Heading 3"` -> `"Titolo 3"`

Nota: Gli altri tooltip (Grassetto, Corsivo, etc.) sono gia in italiano.

### 4. Content page title in Inglese (BASSA PRIORITA)

**File:** `src/app/(dashboard)/content/page.tsx`
- Linea 45: `title: 'Asset Library'` -> `'Libreria Asset'`

## Bug Coerenza Sidebar vs Permessi API

Questi ruoli vedono voci nella sidebar ma ricevono 403 dalle API corrispondenti:

| Ruolo | Voce Sidebar | Permesso API | Risultato |
|-------|-------------|--------------|-----------|
| PM | CRM | crm:read = false | 403 Forbidden |
| SUPPORT | Knowledge Base | kb:read = false | 403 Forbidden |
| SALES | Knowledge Base | kb:read = false | 403 Forbidden |

**Soluzione consigliata:** Allineare o la sidebar (rimuovere le voci) oppure i permessi (aggiungere read).

## Stato Localizzazione Positivo

La maggior parte dell'interfaccia e correttamente in italiano:
- Tutti i placeholder dei form sono in italiano
- I titoli delle modal sono in italiano
- Le label dei campi sono in italiano
- I messaggi di validazione Zod sono in italiano
- I messaggi di errore di validazione API sono in italiano
- Le date usano `date-fns` con formato italiano
- La valuta usa `formatCurrency` con `it-IT` locale e EUR
- I titoli delle pagine e breadcrumb sono in italiano
