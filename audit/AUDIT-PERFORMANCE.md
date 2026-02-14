# AUDIT PERFORMANCE & CODE QUALITY - FODI OS

**Data:** 2026-02-14
**Auditor:** Performance & Code Quality Agent
**Progetto:** /var/www/projects/fodi-os/
**Stack:** Next.js 16.1.6 + React 19.2.4 + Prisma 7.3.0 + TypeScript 5.9.3

---

## Sommario Esecutivo

| Categoria | Severita | Issues |
|-----------|----------|--------|
| Bundle Size & Dynamic Imports | CRITICO | 3 |
| Prisma Query Efficiency | ALTO | 4 |
| Database Indexes | BASSO | 1 |
| Image Optimization | MEDIO | 2 |
| React Re-renders | MEDIO | 2 |
| Memory Leaks | BASSO | 0 |
| TypeScript Quality | BASSO | 2 |
| Error Boundaries | CRITICO | 1 |
| Caching & Data Fetching | MEDIO | 3 |
| SSR vs CSR | MEDIO | 2 |
| next.config.ts Optimization | MEDIO | 2 |
| **Totale** | | **22 issues** |

**Score complessivo: 6.5/10** -- Buona base ma ci sono ottimizzazioni importanti che impattano TTI e bundle size.

---

## 1. Bundle Size & Dynamic Imports [CRITICO]

### 1.1 Recharts importato staticamente in 10+ componenti

**Severita:** CRITICO
**Impatto:** Recharts pesa ~400 KB gzip. Viene importato staticamente in 10 componenti che sono usati solo nella dashboard e nei report, ma il costo del bundle lo pagano TUTTE le pagine perche il layout e` `'use client'`.

**File coinvolti:**
- `src/components/dashboard/RevenueChart.tsx`
- `src/components/dashboard/CashFlowChart.tsx`
- `src/components/dashboard/PipelineFunnel.tsx`
- `src/components/dashboard/InvoiceStatusChart.tsx`
- `src/components/dashboard/ActivityTrendChart.tsx`
- `src/components/dashboard/TaskStatusChart.tsx`
- `src/components/dashboard/TaskCompletionChart.tsx`
- `src/components/dashboard/HoursComparisonChart.tsx`
- `src/components/erp/MarginChart.tsx`
- `src/app/(dashboard)/erp/reports/page.tsx` (import diretto di `BarChart` da recharts)

**Fix:**
```tsx
// Invece di:
import { RevenueChart } from '@/components/dashboard/RevenueChart'

// Usare:
import dynamic from 'next/dynamic'
const RevenueChart = dynamic(() => import('@/components/dashboard/RevenueChart').then(m => ({ default: m.RevenueChart })), {
  loading: () => <Skeleton className="h-64" />,
  ssr: false,
})
```

Applicare a tutti i componenti che importano recharts. Questo rimuove ~400 KB dal bundle iniziale.

### 1.2 Tiptap importato staticamente

**Severita:** ALTO
**Impatto:** @tiptap/react + starter-kit + 5 estensioni pesano ~200 KB. Usato solo in `RichTextEditor.tsx` che appare in wiki e task detail.

**File:** `src/components/shared/RichTextEditor.tsx:2-6`
```tsx
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
```

**Fix:** Lazy load il componente RichTextEditor ovunque viene usato:
```tsx
const RichTextEditor = dynamic(() => import('@/components/shared/RichTextEditor'), { ssr: false })
```

### 1.3 @dnd-kit importato staticamente

**Severita:** MEDIO
**Impatto:** @dnd-kit/core + sortable pesano ~50 KB. Usati solo in KanbanBoard e PipelineKanban.

**File:**
- `src/components/projects/KanbanBoard.tsx:3-17`
- `src/components/crm/PipelineKanban.tsx`

**Fix:** Dynamic import del componente Kanban nelle pagine che lo usano.

---

## 2. Prisma Query Efficiency [ALTO]

### 2.1 Analytics endpoint carica TUTTI i task senza paginazione

**Severita:** CRITICO
**File:** `src/app/api/analytics/tasks/route.ts:34-46`

```typescript
const tasks = await prisma.task.findMany({
  where,
  include: {
    assignee: { select: { ... } },
    assignments: { include: { user: { select: { ... } } } },
    timeEntries: { select: { hours: true } },
    project: { select: { id: true, name: true } },
  },
  // NESSUN take! Carica TUTTI i task
})
```

Poi fa 5 iterazioni complete sull'array (`filter` x3, loop `for...of` x3) per calcolare statistiche che PostgreSQL potrebbe fare in una singola query aggregata.

**Fix:** Usare query SQL aggregate (`GROUP BY status`, `COUNT(*)`, `AVG(completedAt - createdAt)`) invece di caricare tutti i record in memoria e calcolare in JS. Oppure almeno aggiungere `take: 10000` come safety limit.

### 2.2 Notification overfetching (no select)

**Severita:** MEDIO
**File:** `src/app/api/notifications/route.ts:12-19`

```typescript
const notifications = await prisma.notification.findMany({
  where: { userId, ... },
  orderBy: { createdAt: 'desc' },
  take: limit,
  // NESSUN select -- recupera tutte le colonne incluso 'message' (potenzialmente lungo)
})
```

**Fix:** Aggiungere `select` con solo i campi necessari per la lista (id, type, title, isRead, createdAt, link).

### 2.3 Dashboard fa 9 fetch API parallele

**Severita:** MEDIO
**File:** `src/app/(dashboard)/dashboard/page.tsx:169-179`

La dashboard esegue 9 `fetch()` API parallele al mount. Ogni fetch -> API route -> query Prisma. Totale: 9+ query DB per caricare una singola pagina.

```typescript
const [clientsRes, projectsRes, quotesRes, timeRes, invoicesRes, allInvoicesRes, teamRes, expensesRes, ticketsRes] = await Promise.all([
  fetch('/api/clients?status=ACTIVE&limit=1'),
  fetch('/api/projects?status=IN_PROGRESS&limit=1'),
  fetch('/api/quotes?status=SENT&limit=1'),
  fetch('/api/time?from=...&to=...&limit=200'),
  fetch('/api/invoices?status=PAID&limit=200'),
  fetch('/api/invoices?limit=200'),
  fetch('/api/team'),
  fetch('/api/expenses?limit=200'),
  fetch('/api/tickets?status=OPEN,...&limit=1'),
])
```

**Fix:** Creare un endpoint `/api/dashboard` dedicato che fa una singola round-trip con tutte le query aggregate. Ridurrebbe la latenza da ~9 * RTT a 1 * RTT.

### 2.4 Nested include 3+ livelli

**Severita:** BASSO
**File:** `src/app/api/wizard-submissions/[submissionId]/route.ts:19-25`

```typescript
include: {
  template: {
    include: {
      steps: {
        include: { fields: { orderBy: { sortOrder: 'asc' } } },
      },
    },
  },
}
```

3 livelli di nesting. Con molti step/fields genera query pesanti. Accettabile per un singolo record ma da monitorare.

---

## 3. Database Indexes [BASSO]

### 3.1 Analisi Schema

Lo schema Prisma e` **ben indicizzato** complessivamente. I campi critici hanno @@index:

| Modello | Campi indicizzati | Valutazione |
|---------|-------------------|-------------|
| Task | projectId, assigneeId, creatorId, status, isPersonal, milestoneId, parentId, boardColumn, folderId | Ottimo |
| Project | workspaceId, clientId, status, slug, isInternal | Ottimo |
| Client | status, slug | OK |
| Invoice | clientId, status, number | OK |
| Quote | clientId, status, number, templateId | Ottimo |
| Notification | userId, isRead, createdAt | Ottimo |
| ActivityLog | userId, entityType+entityId, createdAt | Ottimo |

**Unico miglioramento suggerito:**

- `TimeEntry`: manca index composito su `[userId, date]` -- usato frequentemente per query "ore della settimana per utente"
- `Task`: potrebbe beneficiare di index composito `[projectId, status]` per le query piu` frequenti

```prisma
// In TimeEntry
@@index([userId, date])

// In Task
@@index([projectId, status])
```

---

## 4. Image Optimization [MEDIO]

### 4.1 Tag `<img>` invece di next/image

**Severita:** MEDIO
**Impatto:** Manca lazy loading nativo, ottimizzazione automatica, e responsive srcset.

**File e occorrenze (8 totali):**

| File | Riga | Contesto |
|------|------|----------|
| `src/app/(dashboard)/content/assets/page.tsx` | 183, 211, 473 | Thumbnail e preview asset |
| `src/app/(dashboard)/calendar/page.tsx` | 256 | Logo Google Calendar |
| `src/components/shared/FileUpload.tsx` | 260 | Preview upload |
| `src/components/chat/MessageBubble.tsx` | 206 | Immagini in chat |
| `src/app/sign/[token]/page.tsx` | 156 | Logo company |
| `src/lib/signature-email.ts` | 61 | Email HTML (accettabile) |

**Fix:** Sostituire `<img>` con `<Image>` da `next/image` per tutti i casi UI. L'email HTML (`signature-email.ts`) e` l'unica eccezione accettabile.

```tsx
// Invece di:
<img src={asset.fileUrl} alt={asset.fileName} className="w-full h-full object-cover" />

// Usare:
<Image src={asset.fileUrl} alt={asset.fileName} fill className="object-cover" />
```

### 4.2 Manca placeholder blur per LCP images

**Severita:** BASSO
Le immagini principali (asset preview, avatar) non hanno `placeholder="blur"` che migliorerebbe la percezione di caricamento.

---

## 5. React Re-renders [MEDIO]

### 5.1 Dashboard Page con 15 useState

**Severita:** MEDIO
**File:** `src/app/(dashboard)/dashboard/page.tsx:100-114`

```typescript
const [stats, setStats] = useState<StatCard[]>([])
const [tasks, setTasks] = useState<TaskItem[]>([])
const [activities, setActivities] = useState<ActivityItem[]>([])
const [loading, setLoading] = useState(true)
const [userName, setUserName] = useState('')
const [notes, setNotes] = useState<StickyNoteItem[]>([])
const [editingNote, setEditingNote] = useState<string | null>(null)
const [invoiceDonutData, setInvoiceDonutData] = useState<ChartSegment[]>([])
const [invoiceTotal, setInvoiceTotal] = useState(0)
const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
const [weekHours, setWeekHours] = useState(0)
const [weekBillableHours, setWeekBillableHours] = useState(0)
const [totalRevenue, setTotalRevenue] = useState(0)
const [totalExpenses, setTotalExpenses] = useState(0)
const [showDropzone, setShowDropzone] = useState(false)
```

15 state separati. Ogni `set*()` causa re-render dell'intera pagina (633 righe). In `loadDashboard()` vengono chiamati 8 setter in sequenza, causando potenzialmente 8 re-render.

**Fix:** Raggruppare in un singolo `useReducer` o almeno in 2-3 oggetti state logici:
```typescript
const [dashboardData, setDashboardData] = useState({
  stats: [], tasks: [], activities: [],
  invoiceDonutData: [], invoiceTotal: 0,
  teamMembers: [], weekHours: 0, weekBillableHours: 0,
  totalRevenue: 0, totalExpenses: 0,
})
```

### 5.2 Funzioni inline create ad ogni render

**Severita:** BASSO
Il file dashboard crea funzioni come `getGreeting()`, `getActivityLabel()` ad ogni render. Non sono passate come props quindi l'impatto e` minimo, ma `activities.map(...)` nel JSX crea nuovi oggetti ad ogni render. Se `ActivityTimeline` avesse `React.memo`, questo invaliderebbe la memoizzazione.

---

## 6. Memory Leaks [BASSO - Ben gestito]

### 6.1 SSE Hook - Corretto

**File:** `src/hooks/useSSE.ts`
L'hook SSE e` ben implementato:
- EventSource chiuso nel cleanup
- Flag `mounted` per evitare state updates post-unmount
- Exponential backoff per reconnect
- Nessun memory leak rilevato

### 6.2 Intervals - Tutti con cleanup

**File:** `src/app/(dashboard)/layout.tsx:82-84, 92-93`
Entrambi gli `setInterval` (notification polling 30s, heartbeat 60s) hanno `clearInterval` nel cleanup. Corretto.

### 6.3 Event Listeners - Tutti con cleanup

Tutti i `addEventListener` trovati hanno il corrispettivo `removeEventListener` nel cleanup dell'effect. Nessun leak.

---

## 7. TypeScript Quality [BASSO]

### 7.1 Uso di `any` (2 occorrenze)

**Severita:** BASSO
Solo 2 file con `any`:

| File | Uso |
|------|-----|
| `src/app/(dashboard)/erp/page.tsx:48` | `(recentInvData.items \|\| []).map((inv: any) => ...)` |
| `src/app/api/projects/[projectId]/route.ts` | 1 occorrenza |

**Fix:** Definire interface esplicite per i dati invoice.

### 7.2 @ts-ignore / @ts-nocheck

**Nessuna occorrenza trovata.** Ottimo.

### 7.3 Nessun type assertion eccessivo

Solo i cast `as Role` dai headers sono presenti, che sono inevitabili nel pattern middleware.

---

## 8. Error Boundaries [CRITICO]

### 8.1 NESSUN error.tsx presente in tutto il progetto

**Severita:** CRITICO
**Impatto:** Se un qualsiasi componente crasha (errore JS runtime), l'utente vede una **white screen** senza possibilita` di recovery.

**File mancanti:**
- `src/app/error.tsx` -- Error boundary root
- `src/app/(dashboard)/error.tsx` -- Error boundary dashboard
- `src/app/(dashboard)/dashboard/error.tsx` -- I chart recharts sono candidati al crash

**Anche mancanti:**
- `src/app/not-found.tsx` -- Pagina 404 personalizzata
- `src/app/loading.tsx` -- Loading state a livello route

**Fix (minimo):**
```tsx
// src/app/(dashboard)/error.tsx
'use client'

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <h2 className="text-xl font-bold">Qualcosa e andato storto</h2>
      <p className="text-muted text-sm">{error.message}</p>
      <button onClick={reset} className="px-4 py-2 bg-primary text-white rounded-lg">
        Riprova
      </button>
    </div>
  )
}
```

---

## 9. Caching & Data Fetching [MEDIO]

### 9.1 Dashboard session fetch duplicato

**Severita:** BASSO
**File:** `src/app/(dashboard)/dashboard/page.tsx:152-156` e `src/app/(dashboard)/layout.tsx:39`

La sessione utente viene fetchata sia nel layout che nella pagina dashboard. Il layout gia` ha i dati utente ma li passa solo ai componenti sidebar/topbar via props, non ai children.

**Fix:** Usare React Context per condividere la sessione tra layout e pagine figlie.

### 9.2 Nessun caching lato client per dati semi-statici

**Severita:** MEDIO
Dati come la lista team members, la sessione utente, e le configurazioni vengono ri-fetchati ad ogni navigazione tra pagine. Non c'e` nessun layer di caching client-side (SWR, React Query, o anche un semplice Context).

**Fix consigliato:** Aggiungere `useSWR` o `@tanstack/react-query` per:
- Sessione utente (stale-while-revalidate)
- Team members (revalidate ogni 5 min)
- Notification count (polling gia` presente, ma senza dedup)

### 9.3 API responses senza Cache-Control

**Severita:** BASSO
Le API non impostano header `Cache-Control`. Per endpoint come `/api/team` (dati che cambiano raramente), un `Cache-Control: private, max-age=300` ridurrebbe le richieste inutili.

---

## 10. SSR vs CSR [MEDIO]

### 10.1 133 componenti con `'use client'`

**Severita:** MEDIO

Su ~150+ componenti totali, 133 sono `'use client'`. Questo significa che quasi tutto il rendering avviene lato client, perdendo i vantaggi di React Server Components.

**Componenti che potrebbero essere Server Components:**
- `src/components/ui/Button.tsx` -- Se non usa hooks
- `src/components/ui/Input.tsx` -- Se non usa hooks
- `src/components/ui/Textarea.tsx` -- Se non usa hooks
- Componenti puramente presentazionali (Badge, Card, StatusBadge)

**Nota:** Molti UI components necessitano `'use client'` per event handlers (onClick, onChange) e hooks Radix. La conversione a RSC e` limitata ai componenti puramente display-only.

### 10.2 Dashboard layout e` client-side

**Severita:** MEDIO
**File:** `src/app/(dashboard)/layout.tsx:1`

Il layout principale e` `'use client'`, il che forza TUTTI i children ad essere anche client-rendered. Questo significa:
- Nessun beneficio da streaming SSR
- Tutto il JS deve essere scaricato prima del render
- Il layout fetch la sessione via client fetch invece che server-side

**Fix ideale (complesso):** Convertire il layout a Server Component e spostare la logica di sessione server-side usando `cookies()`. Richiede refactoring significativo.

---

## 11. next.config.ts [MEDIO]

### 11.1 Nessuna ottimizzazione bundle

**File:** `src/next.config.ts`

Configurazione molto minimale:
```typescript
const nextConfig: NextConfig = {
  output: 'standalone',
  images: { remotePatterns: [...] },
}
```

**Ottimizzazioni mancanti:**

```typescript
const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [...],
    formats: ['image/avif', 'image/webp'], // Formati moderni
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',   // Importa solo le icone usate (~50 KB saving)
      'date-fns',       // Tree-shake locale
      'recharts',       // Se non si usa dynamic import
    ],
  },
}
```

### 11.2 Lucide React tree-shaking

**Severita:** BASSO
`lucide-react` e` importato in quasi tutti i componenti con import individuali (`import { Users, ... } from 'lucide-react'`). Gli import sono gia` corretti (non `import * as`), ma `optimizePackageImports` nel config garantirebbe tree-shaking ottimale.

---

## 12. Unused Code [BASSO]

### 12.1 Dipendenze potenzialmente duplicati

- `framer-motion: ^12.34.0` e `motion: 12.34.0` -- `motion` e` il nuovo nome di `framer-motion`. Avere entrambi e` ridondante.

**Fix:** Rimuovere `framer-motion` e usare solo `motion`:
```bash
npm uninstall framer-motion
```

### 12.2 Dropzone senza funzionalita`

**File:** `src/app/(dashboard)/dashboard/page.tsx:604-613`
Il Dropzone nella dashboard ha `onDrop` che fa solo `console.log`. Non e` collegato a nessuna funzionalita`.

```typescript
onDrop={(files) => {
  console.log('Files dropped:', files) // Solo log!
}}
```

---

## Priorita` di Intervento

### P0 (Fare subito)
1. **Error boundaries** -- Un crash JS rende l'app inutilizzabile (Sez. 8)
2. **Dynamic import Recharts** -- ~400 KB di savings sul bundle iniziale (Sez. 1.1)

### P1 (Entro 1 settimana)
3. **Dynamic import Tiptap** -- ~200 KB di savings (Sez. 1.2)
4. **Endpoint `/api/dashboard`** consolidato -- Da 9 RTT a 1 (Sez. 2.3)
5. **Analytics con query aggregate** -- Evita caricare tutti i task in memoria (Sez. 2.1)

### P2 (Entro 2 settimane)
6. **Sostituire `<img>` con `next/image`** (Sez. 4.1)
7. **`optimizePackageImports`** in next.config.ts (Sez. 11.1)
8. **Rimuovere `framer-motion` duplicato** (Sez. 12.1)
9. **Dashboard state management** -- useReducer (Sez. 5.1)

### P3 (Nice to have)
10. **Client-side caching** (SWR/React Query) (Sez. 9.2)
11. **Index compositi** TimeEntry, Task (Sez. 3.1)
12. **Notification select** (Sez. 2.2)
13. **Session Context** per evitare fetch duplicati (Sez. 9.1)
14. **Convertire UI components a RSC** dove possibile (Sez. 10.1)

---

## Aspetti Positivi

- **Schema Prisma ben indicizzato** -- 30+ @@index su tutti i modelli critici
- **Nessun memory leak** -- Hook SSE, intervals, e listeners tutti con cleanup corretto
- **TypeScript quality alta** -- Solo 2 occorrenze di `any`, zero `@ts-ignore`/`@ts-nocheck`
- **Search API ben progettata** -- `select` espliciti, `take` limits, permessi per modulo
- **$transaction usata dove serve** -- Operazioni multi-write sono atomiche
- **Prisma singleton pattern** -- `lib/prisma.ts` usa globalThis correttamente per evitare connessioni multiple in dev
- **SSE con exponential backoff** -- Implementazione robusta del reconnect
- **Validation con Zod** -- Schema validation presente sugli endpoint di write
