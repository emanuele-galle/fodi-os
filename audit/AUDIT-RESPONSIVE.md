# Audit Mobile / Responsive -- FODI OS

**Data:** 2026-02-14
**Auditor:** mobile-auditor (Claude Opus 4.6)
**Scope:** Tutti i file frontend in `/var/www/projects/fodi-os/src/`

---

## Riepilogo Esecutivo

| Severita | Conteggio |
|----------|-----------|
| CRITICO  | 3         |
| ALTO     | 7         |
| MEDIO    | 9         |
| BASSO    | 5         |
| **Totale** | **24**  |

**Giudizio complessivo:** Il progetto ha una buona base responsive -- il layout Sidebar/BottomNav e ben differenziato, i grafici Recharts usano tutti ResponsiveContainer, le tabelle principali hanno un pattern dual-view (card su mobile, table su desktop). Tuttavia rimangono diversi problemi puntuali, soprattutto su form line-items, grid senza breakpoint mobile, font troppo piccoli e assenza di TouchSensor nel PipelineKanban.

---

## 1. Tabelle -- Overflow Scroll Orizzontale

### Stato: BUONO con eccezioni

La maggior parte delle tabelle ha `overflow-x-auto` wrapper. Pattern dual-view (card mobile / table desktop) usato in: expenses, support, CRM, invoices, quotes, leads, templates, signatures, fatturapa, wizards.

### Problemi trovati

| # | Severita | File | Riga | Problema |
|---|----------|------|------|----------|
| 1.1 | BASSO | `app/portal/quotes/[quoteId]/page.tsx` | 149-166 | La tabella line items nel portale clienti ha `overflow-x-auto` ma su schermi < 360px le 4 colonne (Descrizione, Qty, Prezzo Unit., Totale) rimangono strette. Il testo "Descrizione" puo troncarsi. Manca `min-w-[600px]` sulla table per forzare lo scroll. |
| 1.2 | MEDIO | `components/dashboard/TeamProductivityTable.tsx` | 39-81 | La tabella ha `overflow-x-auto` ma ha 5 colonne (Membro, Assegnate, Completate, Scadute, Ore). Su mobile la colonna "Membro" con avatar + nome si comprime troppo. Manca un layout card alternativo per mobile come nelle altre pagine. |
| 1.3 | MEDIO | `app/(dashboard)/settings/users/page.tsx` | 901-934 | Tabella permessi (modulo x permesso) dentro modal: ha `overflow-x-auto` ma con 5 colonne di checkbox puo essere difficile da usare su schermi piccoli. I target dei checkbox sono solo `h-6 w-6` (24px) -- sotto la soglia 44x44. |

---

## 2. Touch Targets (minimo 44x44px)

### Stato: BUONO -- Button.tsx ha min-h[44px] su mobile

Il componente `Button.tsx` (linee 32-35) applica correttamente `min-h-[44px] md:min-h-0` per tutte le size (sm, md, icon). Questo garantisce touch target adeguati per i bottoni standard.

### Problemi trovati

| # | Severita | File | Riga | Problema |
|---|----------|------|------|----------|
| 2.1 | MEDIO | `app/(dashboard)/settings/users/page.tsx` | 920-926 | Checkbox permessi nella tabella: `h-6 w-6` (24x24px) senza padding aggiuntivo. Troppo piccoli per touch. Serve `min-h-[44px] min-w-[44px]` o padding extra sulla `<td>`. |
| 2.2 | BASSO | `components/projects/KanbanBoard.tsx` | 93 | Badge priorita con `text-[10px]` senza touch target esplicito sulla card. La card stessa e tappabile (OK) ma il badge potrebbe confondere. |
| 2.3 | BASSO | `app/(dashboard)/calendar/page.tsx` | 460-471 | Event pills nel calendar grid desktop: `py-0.5 text-[10px]`. Sono `hidden md:block` quindi non visibili su mobile (OK). Solo i dots appaiono su mobile (1.5x1.5, non tappabili ma l'agenda view compensa). |
| 2.4 | MEDIO | `app/(dashboard)/erp/quotes/new/page.tsx` | 275-284 | Bottone elimina line item: usa `size="icon"` che ha `min-h-[44px]` (OK grazie a Button.tsx). Ma il layout flex con `gap-3` su mobile rende la riga troppo affollata -- vedi punto 5.1. |

---

## 3. BottomNav vs Sidebar

### Stato: ECCELLENTE

| Componente | Visibilita Mobile | Visibilita Desktop |
|------------|-------------------|-------------------|
| Sidebar (`layout.tsx:120`) | `hidden md:block` | Visibile |
| BottomNav (`layout.tsx:145`) | `md:hidden` (nel componente, riga 231) | Nascosta |
| MobileHeader (`layout.tsx:126-131`) | Sempre renderizzato, ma `md:hidden` nel componente (riga 49) | Nascosto |
| Topbar (`layout.tsx:134`) | `hidden md:block` | Visibile |

**Bottom sheet menu:** Ben implementato con animazione slide-up/down, drag-to-dismiss (soglia 80px), overlay backdrop, chiusura automatica al cambio path. Posizionato sopra la nav bar con `bottom-[calc(4rem+env(safe-area-inset-bottom,0px))]`.

**BottomNav nascosta su modal aperta:** `body.modal-open [data-bottom-nav] { display: none !important; }` in `globals.css:431` -- corretto.

---

## 4. CommandPalette e Dropdown

### Stato: BUONO

| Aspetto | Implementazione |
|---------|----------------|
| Container | `max-w-lg mx-4` -- il `mx-4` da margini su mobile |
| Posizione | `pt-[15vh]` -- buon compromesso mobile/desktop |
| Max height risultati | `max-h-[360px] overflow-y-auto` |
| Scroll items in view | Si, `scrollIntoView({ block: 'nearest' })` |
| Touch | Non ottimizzata per swipe/touch ma funzionale come overlay |

### Problemi trovati

| # | Severita | File | Riga | Problema |
|---|----------|------|------|----------|
| 4.1 | BASSO | `components/layout/CommandPalette.tsx` | 138 | `max-w-lg` = 512px. Su schermi 320px con `mx-4` (16px per lato) diventa 288px, che funziona ma e stretto. I risultati con icone e shortcut keyboard si comprimono. Non critico perche la command palette e meno usata su mobile. |

---

## 5. Form Layout Mobile

### Stato: PROBLEMATICO -- diversi form non stackano su mobile

### Problemi trovati

| # | Severita | File | Riga | Problema |
|---|----------|------|------|----------|
| 5.1 | **CRITICO** | `app/(dashboard)/erp/quotes/new/page.tsx` | 244-285 | **Line items del preventivo:** layout `flex items-start gap-3` con input descrizione (flex-1), qty (w-24), prezzo (w-32), totale (w-28), e bottone elimina. Su mobile 375px = 375 - 32(padding) = 343px. Con gap-3 (12px*4=48px) e w fissi (24+32+28+44=128px) restano solo ~167px per la descrizione. **Il layout non stacka verticalmente su mobile.** |
| 5.2 | **CRITICO** | `app/(dashboard)/settings/billing/page.tsx` | 155, 181, 225 | **Tre grid senza breakpoint mobile:** `grid grid-cols-2 gap-4` (riga 155: P.IVA/CF), `grid grid-cols-3 gap-4` (riga 181: CAP/Citta/Provincia), `grid grid-cols-2 gap-4` (riga 225: PEC/Email). Su mobile 375px, `grid-cols-3` comprime i campi a ~105px ciascuno. Il campo Provincia con maxLength=2 va bene, ma CAP e Citta si comprimono troppo. **Servono breakpoint `grid-cols-1 sm:grid-cols-2` e `grid-cols-1 sm:grid-cols-3`.** |
| 5.3 | ALTO | `app/(dashboard)/calendar/page.tsx` | 576, 595 | Grid data/ora nel modal nuovo evento: `grid grid-cols-2 gap-3`. Dentro un modal che su mobile e full-screen, dovrebbe funzionare ma i campi date/time sono molto stretti. |
| 5.4 | ALTO | `app/(dashboard)/crm/[clientId]/page.tsx` | 401 | `grid grid-cols-2 gap-4` senza breakpoint per form contatto. |
| 5.5 | MEDIO | `components/erp/FieldEditor.tsx` | 215, 236 | `grid grid-cols-2 gap-3` senza breakpoint sm:. |
| 5.6 | MEDIO | `components/erp/NewSignatureModal.tsx` | 165, 191 | `grid grid-cols-1 md:grid-cols-2 gap-3` -- questo e corretto. |
| 5.7 | ALTO | `app/(dashboard)/erp/fatturapa/page.tsx` | 97 | `grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3` -- I filtri status su mobile sono in 2 colonne, OK ma con 8 status badge diventano 4 righe. |
| 5.8 | MEDIO | `components/dashboard/FinancialSummaryCard.tsx` | 47 | `grid grid-cols-2 gap-4` senza breakpoint. Essendo dentro una card piccola probabilmente va bene, ma su schermi 320px si comprime. |
| 5.9 | MEDIO | `components/dashboard/QuickActionsGrid.tsx` | 29 | `grid grid-cols-2 gap-2.5` -- Quick actions in 2 colonne. Su mobile e intenzionale e funziona, dato che sono solo icone con label corte. |

### Form con breakpoint corretti (buoni esempi)

- `dashboard/page.tsx:323` -- `grid grid-cols-2 lg:grid-cols-3`
- `dashboard/page.tsx:349` -- `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`
- `tasks/page.tsx:342` -- `grid grid-cols-2 md:grid-cols-4`
- `internal/page.tsx:262` -- `grid grid-cols-2 lg:grid-cols-4`
- `erp/reports/page.tsx:166` -- `grid grid-cols-2 lg:grid-cols-4`

---

## 6. Grafici Recharts

### Stato: ECCELLENTE -- Tutti usano ResponsiveContainer

| Componente | Chart Type | ResponsiveContainer | Width | Height |
|-----------|-----------|---------------------|-------|--------|
| PipelineFunnel | BarChart (vertical) | Si | 100% | 200 |
| TaskCompletionChart | BarChart | Si | 100% | 280 |
| HoursComparisonChart | BarChart | Si | 100% | 280 |
| InvoiceStatusChart | PieChart | Si | 200 | 200 |
| ActivityTrendChart | AreaChart | Si | 100% | {height} prop |
| RevenueChart | BarChart | Si | 100% | 280 |
| CashFlowChart | AreaChart | Si | 100% | 280 |
| TaskStatusChart | PieChart | Si | 100% | 220 |
| MarginChart | BarChart | Si | 100% | 300 |
| ERP Reports (x2) | BarChart | Si | 100% | 200 |

### Problemi trovati

| # | Severita | File | Riga | Problema |
|---|----------|------|------|----------|
| 6.1 | BASSO | `components/dashboard/InvoiceStatusChart.tsx` | 49 | `ResponsiveContainer width={200} height={200}` -- width fisso a 200px invece di 100%. Su schermi piccoli la PieChart potrebbe essere tagliata se il container padre e piu stretto. |

---

## 7. Font Minimo (text-xs su mobile)

### Stato: ACCETTABILE con note

`text-xs` e usato in ~200+ occorrenze nel progetto. Corrisponde a `font-size: 0.75rem` (12px) che e sotto la soglia raccomandata di 14px per mobile.

### Analisi per contesto

**Uso accettabile di text-xs (non critico):**
- Label secondari / metadata (date, contatori badge, status)
- Header tabelle (`text-xs font-medium text-muted uppercase tracking-wider`)
- Badge e chip (`text-[10px]` nei badge priority -- accettabile per elementi decorativi)
- Shortcut keyboard (`text-[10px]`, `text-[11px]` nella CommandPalette)
- Legenda calendari, sottotitoli statistiche

**Uso problematico di text-xs:**

| # | Severita | File | Riga | Problema |
|---|----------|------|------|----------|
| 7.1 | MEDIO | `app/(dashboard)/time/page.tsx` | 184, 195 | `text-[10px]` (10px!) per le label "Oggi", "Questa Settimana" nelle stat card. Estremamente piccolo su mobile. |
| 7.2 | BASSO | `components/projects/GanttChart.tsx` | 177, 189 | `text-xs` per i nomi task nel pannello sinistro del Gantt. Su mobile il Gantt e gia problematico (vedi punto 11). |

---

## 8. Safe Area iOS

### Stato: ECCELLENTE

| Aspetto | Implementazione | File |
|---------|----------------|------|
| BottomNav padding | `pb-[env(safe-area-inset-bottom,0px)]` | BottomNav.tsx:231 |
| Bottom sheet position | `bottom-[calc(4rem+env(safe-area-inset-bottom,0px))]` | BottomNav.tsx:175 |
| MessageInput padding | `pb-[max(0.75rem,env(safe-area-inset-bottom))]` | MessageInput.tsx:93 |
| Body (PWA) | `@supports (padding-bottom: env(safe-area-inset-bottom)) { body { padding-bottom: env(...) } }` | globals.css:339-343 |

Nessun problema trovato. L'implementazione copre tutti i punti di contatto con il bordo inferiore.

---

## 9. Overflow Orizzontale

### Stato: BUONO

- `html { overflow-x: hidden; }` in globals.css:5 -- previene scroll orizzontale globale
- Layout dashboard: `overflow-x-hidden` su `min-w-0` nel container principale (layout.tsx:124)
- Tabelle: tutte wrappate in `overflow-x-auto`
- Kanban boards: `overflow-x-auto` con `snap-x snap-mandatory` su mobile
- Tab bars: `overflow-x-auto scrollbar-none`

### Problemi trovati

| # | Severita | File | Riga | Problema |
|---|----------|------|------|----------|
| 9.1 | ALTO | `app/(dashboard)/erp/quotes/new/page.tsx` | 244 | Line items flex row senza wrap puo causare overflow su mobile < 375px (collegato al punto 5.1). |

---

## 10. Immagini (next/image, CLS)

### Stato: ACCETTABILE

Il progetto non utilizza molte immagini nel frontend. Le immagini principali sono:
- Avatar: componente custom `Avatar.tsx` con dimensioni fisse per size variant
- Logo: componente `Logo.tsx` con `width` e `height` espliciti
- Google Calendar icon: `<img>` con `className="h-5 w-5"` (calendar page:256) -- dimensioni fisse, OK

Nessun uso significativo di `next/image` trovato nelle pagine dashboard. Gli asset del content manager (libreria asset) usano URL da MinIO ma non sono stati analizzati in dettaglio.

---

## 11. KanbanBoard e GanttChart

### KanbanBoard: BUONO

| Aspetto | Implementazione |
|---------|----------------|
| Colonne mobile | `w-[75vw]` con `snap-center snap-mandatory` |
| Colonne desktop | `md:w-72 md:snap-align-none` |
| Scroll | `overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0` (fullbleed su mobile) |
| Touch sensor | `TouchSensor` con `delay: 200, tolerance: 5` -- permette scroll senza attivare drag |
| Card drag | `cursor-grab active:cursor-grabbing` |

### Problemi trovati

| # | Severita | File | Riga | Problema |
|---|----------|------|------|----------|
| 11.1 | **CRITICO** | `components/crm/PipelineKanban.tsx` | 94-98 | **Manca TouchSensor!** Solo `PointerSensor` configurato. Su mobile il drag non funziona correttamente: il tentativo di scrollare orizzontalmente attiva il drag delle card invece dello scroll della Kanban board. Il KanbanBoard dei task (riga 167-173) ha correttamente entrambi `PointerSensor` + `TouchSensor`. |
| 11.2 | ALTO | `components/projects/GanttChart.tsx` | 56-58 | `LABEL_WIDTH = 200` fisso con panel sinistro non responsive. Su mobile 375px, rimangono solo 175px per la timeline SVG. Nessuna alternativa mobile (es. lista task con barre inline, o hide del panel sinistro). Il Gantt e essenzialmente inutilizzabile su mobile. |
| 11.3 | ALTO | `components/projects/GanttChart.tsx` | 196 | Il chart SVG ha `width={totalWidth}` calcolato (potenzialmente migliaia di px). `overflow-x-auto` presente (OK) ma la combinazione label panel + SVG largo rende il double-scroll confuso su mobile. |

---

## 12. Modal su Mobile

### Stato: ECCELLENTE

Il componente `Modal.tsx` ha un'ottima implementazione mobile:

| Aspetto | Implementazione |
|---------|----------------|
| Mobile layout | `w-full rounded-none` (full-screen sheet) |
| Desktop layout | `md:h-auto md:max-h-[85vh] md:rounded-xl` |
| Swipe indicator | `md:hidden` grab bar in alto |
| Swipe-to-dismiss | Touch drag con threshold 120px, opacity fade |
| Close button | `min-h-[44px] min-w-[44px]` -- touch target corretto |
| Body scroll lock | `document.body.style.overflow = 'hidden'` |
| Padding mobile | `px-4 md:px-6 py-4 pb-8 md:pb-4` -- extra padding bottom su mobile |
| Content scroll | `overflow-y-auto overscroll-contain` |

Nessun problema trovato. I modal non vengono tagliati su viewport piccoli.

---

## Riepilogo Problemi per Priorita

### CRITICO (da risolvere subito)

1. **[5.1] Line items preventivo non stackano su mobile** -- `erp/quotes/new/page.tsx:244`. Layout flex orizzontale con campi fissi non si adatta a schermi < 400px. Soluzione: aggiungere layout verticale mobile come fatto in `TemplateLineItemsEditor.tsx` (che ha gia un layout `md:hidden` alternativo).

2. **[5.2] Form fatturazione senza breakpoint mobile** -- `settings/billing/page.tsx:155,181,225`. Grid `cols-2` e `cols-3` senza `sm:` breakpoint. Campi CAP/Citta/Provincia in 3 colonne su mobile 375px = 105px per campo.

3. **[11.1] PipelineKanban manca TouchSensor** -- `crm/PipelineKanban.tsx:94-98`. Il drag non funziona su mobile. Lo scroll orizzontale della kanban board viene intercettato dal drag handler.

### ALTO (da risolvere presto)

4. **[5.3] Grid date/ora nel modal calendario** -- `calendar/page.tsx:576,595`
5. **[5.4] Grid contatto CRM senza breakpoint** -- `crm/[clientId]/page.tsx:401`
6. **[9.1] Line items overflow su mobile** -- Collegato a 5.1
7. **[11.2] GanttChart inutilizzabile su mobile** -- `GanttChart.tsx:56-58`
8. **[11.3] GanttChart double-scroll confuso** -- `GanttChart.tsx:196`
9. **[5.7] FatturaPA 8 filtri compressi** -- `erp/fatturapa/page.tsx:97`
10. **[1.3] Checkbox permessi troppo piccoli per touch** -- `settings/users/page.tsx:920`

### MEDIO

11. **[1.2] TeamProductivityTable senza vista card mobile**
12. **[2.1] Checkbox permessi sotto 44px**
13. **[5.5] FieldEditor grid senza breakpoint**
14. **[5.8] FinancialSummaryCard grid senza breakpoint**
15. **[5.9] QuickActionsGrid -- accettabile**
16. **[7.1] text-[10px] nelle stat card time tracking**
17. **[2.4] Layout line items affollato**
18. **[4.1] CommandPalette stretta su 320px**
19. **[6.1] InvoiceStatusChart width fisso**

### BASSO

20. **[1.1] Tabella portal quotes comprimibile**
21. **[2.2] Badge priority text-[10px]**
22. **[2.3] Calendar event pills tiny** (solo desktop, OK)
23. **[7.2] GanttChart label text-xs**
24. **[4.1] CommandPalette margini minimi su 320px**

---

## Elementi Positivi (Best Practice Seguite)

1. **Button.tsx** con `min-h-[44px] md:min-h-0` -- touch target corretto su tutto il progetto
2. **Modal.tsx** con full-screen sheet + swipe-to-dismiss su mobile
3. **BottomNav** con safe-area, bottom sheet menu, overlay, drag-to-dismiss
4. **MobileHeader** con touch targets 44x44 (`h-11 w-11`) e truncate per testo lungo
5. **Dual-view pattern** (card mobile / table desktop) usato in 10+ pagine
6. **KanbanBoard** con `TouchSensor` + `snap-x snap-mandatory` + colonne `w-[75vw]`
7. **Tutti i grafici Recharts** con `ResponsiveContainer`
8. **Safe area iOS** coperta in tutti i punti critici
9. **`html { overflow-x: hidden }`** previene scroll orizzontale
10. **`-webkit-tap-highlight-color: transparent`** rimuove flash blu su tap
11. **Mobile-specific touch optimizations** in globals.css (hover:none disables transform)
12. **`kanban-mobile-scroll`** CSS per task kanban view (page.tsx:671)
13. **Chat mobile panel** con `position: absolute inset: 0` per mobile
14. **Emoji picker** responsive: `w-[calc(100vw-2rem)] md:w-[280px]` con touch targets `h-10 w-10 md:h-8 md:w-8`

---

## Fix Suggeriti (Codice)

### Fix 5.1 - Line Items Preventivo

```tsx
// erp/quotes/new/page.tsx - Aggiungere layout mobile
{lineItems.map((item, index) => (
  <div key={index}>
    {/* Mobile: stack verticale */}
    <div className="md:hidden space-y-2 p-3 bg-secondary/20 rounded-lg">
      <Input placeholder="Descrizione *" value={item.description} ... />
      <div className="grid grid-cols-3 gap-2">
        <Input type="number" placeholder="Qty" ... />
        <Input type="number" placeholder="Prezzo" ... />
        <div className="flex items-center justify-end text-sm font-medium">
          {formatCurrency(item.quantity * item.unitPrice)}
        </div>
      </div>
    </div>
    {/* Desktop: flex row */}
    <div className="hidden md:flex items-start gap-3">
      {/* ...layout esistente... */}
    </div>
  </div>
))}
```

### Fix 5.2 - Form Fatturazione

```tsx
// settings/billing/page.tsx
// Riga 155: grid-cols-2 -> grid-cols-1 sm:grid-cols-2
// Riga 181: grid-cols-3 -> grid-cols-1 sm:grid-cols-3
// Riga 225: grid-cols-2 -> grid-cols-1 sm:grid-cols-2
```

### Fix 11.1 - PipelineKanban TouchSensor

```tsx
// crm/PipelineKanban.tsx - Aggiungere TouchSensor
import { TouchSensor } from '@dnd-kit/core'

const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  }),
  useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 },
  })
)
```

---

*Fine audit responsive. 24 issue trovate, 3 critiche, 7 alte.*
