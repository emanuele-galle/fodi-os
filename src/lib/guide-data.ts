import { brand } from '@/lib/branding'
import {
  LayoutDashboard, Users, FolderKanban, Euro, Film, MessageCircle,
  LifeBuoy, Smartphone, Shield, type LucideIcon,
  BarChart3, Bell, Zap, Settings, PieChart, Target, UserPlus, Handshake,
  Tags, GitMerge, Columns3, Clock, Milestone as MilestoneIcon, FileText,
  Receipt, CreditCard, TrendingUp, FileSignature, BookOpen,
  Upload, FolderOpen, CheckCircle2, Share2, Hash, AtSign, SmilePlus,
  MessageSquare, Ticket, AlertTriangle, UserCheck, Wifi, Download,
  Menu, WifiOff, UserCog, Lock, Palette, CreditCard as CardIcon,
} from 'lucide-react'

export interface GuideFeature {
  icon: LucideIcon
  title: string
  description: string
}

export interface GuideWorkflowStep {
  step: number
  title: string
  description: string
  tip?: string
}

export interface GuideFAQ {
  question: string
  answer: string
}

export interface GuideModule {
  slug: string
  number: number
  icon: LucideIcon
  title: string
  subtitle: string
  description: string
  heroColor: string
  videoUrl?: string
  features: GuideFeature[]
  workflow: GuideWorkflowStep[]
  tips: string[]
  faq: GuideFAQ[]
  relatedModules: string[]
}

const STORAGE_URL = brand.storageUrl

export const GUIDE_MODULES: GuideModule[] = [
  {
    slug: 'overview',
    number: 1,
    icon: LayoutDashboard,
    title: 'Panoramica Generale',
    subtitle: 'Dashboard e primo accesso',
    description: `La dashboard è il cuore di ${brand.name}: una panoramica in tempo reale su tutte le attività della tua azienda. Widget personalizzabili, KPI sempre aggiornati e accesso rapido a ogni sezione ti permettono di avere il controllo completo senza perdere tempo.`,
    heroColor: '#6366f1',
    videoUrl: `${STORAGE_URL}/01-overview.mp4`,
    features: [
      { icon: BarChart3, title: 'KPI in tempo reale', description: 'Revenue, clienti attivi, task completati e ticket aperti sempre visibili.' },
      { icon: Zap, title: 'Quick Actions', description: 'Crea clienti, progetti, preventivi e task con un solo click dalla topbar.' },
      { icon: Bell, title: 'Centro notifiche', description: 'Tutte le notifiche in un unico pannello: menzioni, assegnazioni, scadenze.' },
      { icon: Settings, title: 'Widget personalizzabili', description: 'Trascina e riorganizza i widget per creare la dashboard perfetta per te.' },
      { icon: PieChart, title: 'Grafici interattivi', description: 'Trend revenue, pipeline deals e distribuzione task in grafici dinamici.' },
    ],
    workflow: [
      { step: 1, title: 'Primo accesso', description: 'Effettua il login con le credenziali ricevute. Un wizard di onboarding ti guiderà nella configurazione iniziale.', tip: 'Puoi rivedere l\'onboarding in qualsiasi momento dalla sezione Guida.' },
      { step: 2, title: 'Esplora la dashboard', description: 'Familiarizza con i KPI principali e i widget disponibili. Ogni widget mostra dati in tempo reale.' },
      { step: 3, title: 'Personalizza la vista', description: 'Riorganizza i widget trascinandoli nella posizione che preferisci. Nascondi quelli che non ti servono.' },
      { step: 4, title: 'Configura le notifiche', description: 'Vai nelle impostazioni per scegliere quali notifiche ricevere e come (push, email, in-app).' },
    ],
    tips: [
      'Controlla la dashboard ogni mattina per una visione d\'insieme rapida',
      'I contatori si aggiornano in tempo reale senza ricaricare la pagina',
      'Usa le Quick Actions nella topbar per creare velocemente nuovi elementi',
      'Clicca sui KPI per accedere direttamente alla sezione di dettaglio',
      'Il campo ricerca globale cerca in clienti, progetti, task e preventivi',
    ],
    faq: [
      { question: 'Posso personalizzare i widget della dashboard?', answer: 'Sì, puoi trascinare i widget per riorganizzarli e nascondere quelli che non ti servono dalle impostazioni.' },
      { question: 'I dati si aggiornano in tempo reale?', answer: 'Sì, tutti i KPI e i widget si aggiornano automaticamente senza dover ricaricare la pagina.' },
      { question: 'Come posso rivedere l\'onboarding?', answer: 'Vai nella sezione Guida e clicca su "Rivedi onboarding" per ripetere il tutorial iniziale.' },
    ],
    relatedModules: ['crm', 'projects', 'erp'],
  },
  {
    slug: 'crm',
    number: 2,
    icon: Users,
    title: 'CRM & Pipeline',
    subtitle: 'Gestione clienti e opportunità',
    description: `Il CRM di ${brand.name} ti permette di gestire l'intero ciclo di vita del cliente: dal primo contatto alla chiusura del deal. Pipeline visuale, tracking delle interazioni e dashboard CRM dedicata ti aiutano a non perdere mai un'opportunità.`,
    heroColor: '#10b981',
    videoUrl: `${STORAGE_URL}/02-crm.mp4`,
    features: [
      { icon: UserPlus, title: 'Gestione clienti', description: 'Anagrafica completa con contatti, azienda, email, telefono e note personalizzate.' },
      { icon: Target, title: 'Pipeline deals', description: 'Pipeline visuale drag & drop per seguire ogni opportunità dalla proposta alla chiusura.' },
      { icon: Handshake, title: 'Interazioni', description: 'Registra chiamate, email, riunioni e note per ogni cliente. Storico completo sempre accessibile.' },
      { icon: Tags, title: 'Tag e filtri', description: 'Categorizza i clienti con tag personalizzati e filtra rapidamente per stato, valore, settore.' },
      { icon: PieChart, title: 'Dashboard CRM', description: 'KPI dedicati: clienti attivi, deal in pipeline, revenue forecast, clienti trascurati.' },
      { icon: GitMerge, title: 'Merge clienti', description: 'Unisci i duplicati mantenendo tutte le interazioni e i dati di entrambi i record.' },
    ],
    workflow: [
      { step: 1, title: 'Crea il cliente', description: 'Dalla lista clienti, clicca "Nuovo cliente" e inserisci i dati: nome, azienda, email, telefono.', tip: 'Puoi importare clienti in blocco da CSV.' },
      { step: 2, title: 'Aggiungi un deal', description: 'Apri la scheda cliente e crea un nuovo deal con valore stimato, descrizione e data prevista.' },
      { step: 3, title: 'Gestisci la pipeline', description: 'Trascina i deal tra le colonne della pipeline: Lead → Proposta → Negoziazione → Vinto/Perso.' },
      { step: 4, title: 'Traccia le interazioni', description: 'Registra ogni contatto: chiamata, email, riunione. Il sistema tiene traccia della cronologia completa.' },
      { step: 5, title: 'Monitora dalla dashboard', description: 'Controlla la dashboard CRM per identificare clienti trascurati e deal in stallo.' },
    ],
    tips: [
      'Usa i tag per categorizzare i clienti (es. settore, priorità, fonte)',
      'Registra ogni interazione per non perdere il filo delle trattative',
      'Monitora i clienti trascurati dalla dashboard CRM',
      'Collega i deal ai progetti per tracciare il ciclo completo',
      'Usa i filtri rapidi per trovare velocemente i clienti che cerchi',
      'Imposta promemoria per follow-up sui deal in stallo',
    ],
    faq: [
      { question: 'Posso importare clienti da un file CSV?', answer: 'Sì, dalla lista clienti puoi usare la funzione di importazione per caricare clienti da file CSV.' },
      { question: 'Come funziona il merge dei clienti duplicati?', answer: 'Seleziona il cliente principale e quello da unire. Tutti i dati, le interazioni e i deal verranno consolidati nel record principale.' },
      { question: 'Posso personalizzare le colonne della pipeline?', answer: 'Le colonne standard sono Lead, Proposta, Negoziazione, Vinto e Perso. Puoi gestirle dalle impostazioni CRM.' },
      { question: 'Come vedo i clienti che non contatto da tempo?', answer: 'La dashboard CRM mostra automaticamente i clienti trascurati, ovvero quelli senza interazioni negli ultimi 30 giorni.' },
    ],
    relatedModules: ['projects', 'erp', 'support'],
  },
  {
    slug: 'projects',
    number: 3,
    icon: FolderKanban,
    title: 'Project Management',
    subtitle: 'Progetti, task e time tracking',
    description: 'Gestisci i tuoi progetti dall\'inizio alla fine con kanban board, task gerarchici, milestone e tracciamento ore. Ogni progetto è collegato ai clienti CRM e ai preventivi ERP per avere una visione completa del lavoro.',
    heroColor: '#f59e0b',
    videoUrl: `${STORAGE_URL}/03-projects.mp4`,
    features: [
      { icon: Columns3, title: 'Kanban board', description: 'Vista kanban drag & drop con colonne personalizzabili: Da fare, In corso, In review, Completato.' },
      { icon: Clock, title: 'Time tracking', description: 'Traccia le ore lavorate per ogni task con timer integrato o inserimento manuale.' },
      { icon: MilestoneIcon, title: 'Milestone', description: 'Definisci milestone con scadenze per organizzare il progetto in fasi.' },
      { icon: FileText, title: 'File & documenti', description: 'Carica file nei task o nel progetto. Preview integrato per immagini e documenti.' },
      { icon: Users, title: 'Assegnazione team', description: 'Assegna task ai membri del team. Notifiche automatiche per scadenze e menzioni.' },
    ],
    workflow: [
      { step: 1, title: 'Crea il progetto', description: 'Clicca "Nuovo progetto", inserisci nome, descrizione e collega il cliente CRM.', tip: 'Scegli un colore per identificare rapidamente il progetto nella lista.' },
      { step: 2, title: 'Aggiungi task', description: 'Crea i task necessari con titolo, descrizione, assegnatario e stima ore.' },
      { step: 3, title: 'Organizza con il kanban', description: 'Usa la vista kanban per spostare i task tra le colonne. Filtra per assegnatario o priorità.' },
      { step: 4, title: 'Traccia le ore', description: 'Avvia il timer quando lavori su un task o inserisci le ore manualmente a fine giornata.' },
      { step: 5, title: 'Monitora l\'avanzamento', description: 'Controlla le milestone e la percentuale di completamento dalla vista progetto.' },
    ],
    tips: [
      'Usa le cartelle per organizzare i task per area tematica',
      'Assegna stime orarie ai task per monitorare il budget del progetto',
      'Collega i progetti ai clienti CRM per una visione completa',
      'Usa i filtri rapidi per vedere solo i task assegnati a te',
      'Imposta le milestone per tenere traccia delle scadenze importanti',
      'Il time tracking alimenta automaticamente i report ore del team',
    ],
    faq: [
      { question: 'Posso creare sotto-task?', answer: 'Sì, ogni task può avere sotto-task per suddividere il lavoro in attività più piccole e gestibili.' },
      { question: 'Come funziona il time tracking?', answer: 'Puoi avviare un timer con un click quando inizi a lavorare su un task, oppure inserire le ore manualmente. Le ore vengono tracciate per task, progetto e persona.' },
      { question: 'Posso esportare il report delle ore?', answer: 'Sì, dalla sezione Team puoi esportare il report ore filtrato per progetto, periodo e membro del team.' },
    ],
    relatedModules: ['crm', 'erp', 'chat'],
  },
  {
    slug: 'erp',
    number: 4,
    icon: Euro,
    title: 'ERP Finanziario',
    subtitle: 'Preventivi, spese e contabilità',
    description: `L'ERP di ${brand.name} copre tutto il ciclo finanziario: dalla creazione di preventivi professionali alla gestione delle spese e degli abbonamenti ricorrenti. Template personalizzabili, firme digitali e report dettagliati per tenere sotto controllo le finanze.`,
    heroColor: '#8b5cf6',
    videoUrl: `${STORAGE_URL}/04-erp.mp4`,
    features: [
      { icon: FileText, title: 'Preventivi professionali', description: 'Crea preventivi PDF con il tuo logo, termini e condizioni. Invio via email con un click.' },
      { icon: BookOpen, title: 'Template riutilizzabili', description: 'Salva template di preventivo per velocizzare la creazione di documenti ricorrenti.' },
      { icon: Receipt, title: 'Gestione spese', description: 'Registra spese per categoria, fornitore e progetto. Upload ricevute con foto.' },
      { icon: CreditCard, title: 'Abbonamenti ricorrenti', description: 'Traccia abbonamenti software, servizi e licenze con notifiche di rinnovo.' },
      { icon: TrendingUp, title: 'Report finanziari', description: 'Revenue, margini, trend mensili e previsioni in grafici interattivi.' },
      { icon: FileSignature, title: 'Firme digitali', description: 'I clienti possono firmare i preventivi online. Tracciamento stato: inviato, visto, firmato.' },
    ],
    workflow: [
      { step: 1, title: 'Crea un template', description: 'Definisci un template base con la tua intestazione, voci ricorrenti e condizioni di pagamento.', tip: 'Un buon template ti fa risparmiare ore di lavoro.' },
      { step: 2, title: 'Genera il preventivo', description: 'Seleziona il template, compila le voci, imposta sconti e IVA. Il totale si calcola automaticamente.' },
      { step: 3, title: 'Invia al cliente', description: 'Con un click invii il preventivo via email con link per visualizzazione e firma digitale.' },
      { step: 4, title: 'Traccia lo stato', description: 'Monitora quando il cliente apre, visualizza e firma il preventivo. Promemoria automatici.' },
      { step: 5, title: 'Registra i pagamenti', description: 'Quando il preventivo viene accettato, registra i pagamenti parziali o totali per tracciare i saldi.' },
    ],
    tips: [
      'Crea template di preventivo per velocizzare il lavoro ripetitivo',
      'Traccia gli abbonamenti per non dimenticare i rinnovi',
      'Usa i report per analizzare revenue e spese nel tempo',
      'Collega i preventivi ai deal CRM per chiudere il ciclo commerciale',
      'Imposta le condizioni di pagamento predefinite nei template',
      'Usa il journal per annotare movimenti finanziari non categorizzabili',
    ],
    faq: [
      { question: 'Posso personalizzare il layout dei preventivi?', answer: 'Sì, i preventivi usano il tuo logo e i colori aziendali. Puoi personalizzare intestazione, piè di pagina e condizioni.' },
      { question: 'Come funziona la firma digitale?', answer: 'Il cliente riceve un link via email. Può visualizzare il preventivo e firmarlo disegnando la firma sul touch screen o con il mouse.' },
      { question: 'Posso gestire più valute?', answer: `Attualmente ${brand.name} supporta l'Euro come valuta principale. Il supporto multi-valuta è in roadmap.` },
      { question: 'Come traccio gli abbonamenti ricorrenti?', answer: 'Dalla sezione Abbonamenti puoi aggiungere ogni servizio con importo, frequenza e data rinnovo. Riceverai notifiche prima della scadenza.' },
    ],
    relatedModules: ['crm', 'projects', 'overview'],
  },
  {
    slug: 'content',
    number: 5,
    icon: Film,
    title: 'Contenuti & Asset',
    subtitle: 'Gestione contenuti e social media',
    description: `La sezione Contenuti di ${brand.name} è il tuo hub per gestire asset digitali, processi di revisione e pubblicazione social. Carica file, organizzali per progetto, gestisci il ciclo di approvazione e pubblica direttamente sui tuoi canali social.`,
    heroColor: '#ec4899',
    videoUrl: `${STORAGE_URL}/07-assets.mp4`,
    features: [
      { icon: Upload, title: 'Upload & libreria', description: 'Carica immagini, video, documenti e file di ogni tipo. Organizza per progetto e tag.' },
      { icon: FolderOpen, title: 'Google Drive sync', description: 'Collega le cartelle Google Drive per sincronizzare automaticamente gli asset.' },
      { icon: CheckCircle2, title: 'Workflow di revisione', description: 'Invia asset in revisione al team o al cliente. Commenti, approvazioni e richieste di modifica.' },
      { icon: Share2, title: 'Social media', description: `Pianifica e pubblica contenuti sui canali social direttamente da ${brand.name}.` },
    ],
    workflow: [
      { step: 1, title: 'Carica gli asset', description: 'Trascina i file nella libreria o usa il pulsante upload. Puoi caricare più file contemporaneamente.', tip: 'Supportati: immagini, video, PDF, documenti Office e file compressi.' },
      { step: 2, title: 'Organizza per progetto', description: 'Assegna gli asset ai progetti e usa i tag per categorizzarli.' },
      { step: 3, title: 'Avvia la revisione', description: 'Seleziona gli asset e avvia un ciclo di revisione: il team riceverà una notifica per il feedback.' },
      { step: 4, title: 'Approva e pubblica', description: 'Dopo l\'approvazione, gli asset sono pronti per la pubblicazione o la consegna al cliente.' },
    ],
    tips: [
      'Carica gli asset nel progetto corretto per mantenerli organizzati',
      'Usa le revisioni per raccogliere feedback strutturati dal team e dai clienti',
      'Collega Google Drive per sincronizzare automaticamente i file',
      'Usa i tag per trovare rapidamente gli asset in libreria',
      'Pianifica i post social in anticipo per una comunicazione costante',
    ],
    faq: [
      { question: 'Quali formati di file sono supportati?', answer: 'Puoi caricare immagini (JPG, PNG, SVG, WebP), video (MP4, MOV), documenti (PDF, DOCX, XLSX) e file compressi (ZIP, RAR).' },
      { question: 'Come funziona il workflow di revisione?', answer: 'Seleziona gli asset, scegli i revisori e avvia il ciclo. Ogni revisore può commentare, approvare o richiedere modifiche. Lo stato viene tracciato per ogni asset.' },
      { question: 'Posso collegare più account social?', answer: 'Sì, puoi collegare account Instagram, Facebook, LinkedIn e Twitter per pubblicare contenuti multipiattaforma.' },
    ],
    relatedModules: ['projects', 'chat', 'support'],
  },
  {
    slug: 'chat',
    number: 6,
    icon: MessageCircle,
    title: 'Chat Team',
    subtitle: 'Comunicazione in tempo reale',
    description: `La chat di ${brand.name} è pensata per la comunicazione del team: canali dedicati per progetto, messaggi diretti, reazioni, thread e condivisione file. Tutto integrato con le notifiche e le menzioni per non perdere mai un messaggio importante.`,
    heroColor: '#06b6d4',
    videoUrl: `${STORAGE_URL}/06-chat.mp4`,
    features: [
      { icon: Hash, title: 'Canali', description: 'Canali pubblici e privati per organizzare le conversazioni per tema, progetto o team.' },
      { icon: AtSign, title: 'Messaggi diretti', description: 'Chat private 1:1 o di gruppo per comunicazioni riservate.' },
      { icon: SmilePlus, title: 'Reazioni & thread', description: 'Reagisci ai messaggi con emoji e rispondi nei thread per mantenere ordine.' },
      { icon: MessageSquare, title: 'File sharing', description: 'Condividi file, immagini e documenti direttamente nella chat con preview.' },
    ],
    workflow: [
      { step: 1, title: 'Crea un canale', description: 'Crea un canale dedicato per ogni progetto o argomento. Scegli se renderlo pubblico o privato.', tip: 'Usa il formato #progetto-nome per una nomenclatura coerente.' },
      { step: 2, title: 'Invita il team', description: 'Aggiungi i membri del team al canale. Possono anche entrare autonomamente nei canali pubblici.' },
      { step: 3, title: 'Comunica', description: 'Scrivi messaggi, condividi file e menziona i colleghi con @nome per attirare la loro attenzione.' },
      { step: 4, title: 'Usa i thread', description: 'Per discussioni approfondite, rispondi nel thread per non intasare il canale principale.' },
    ],
    tips: [
      'Crea canali dedicati per ogni progetto per mantenere le conversazioni organizzate',
      'Usa i messaggi diretti per comunicazioni rapide e riservate',
      'Menziona i colleghi con @nome per inviare notifiche mirate',
      'Usa le reazioni emoji per feedback rapidi senza scrivere messaggi',
      'Rispondi nei thread per discussioni lunghe senza intasare il canale',
      'Condividi file trascinandoli nella chat: supporta immagini, PDF e documenti',
    ],
    faq: [
      { question: 'Posso creare canali privati?', answer: 'Sì, durante la creazione del canale puoi scegliere se renderlo pubblico (visibile a tutti) o privato (solo su invito).' },
      { question: 'Le chat vengono salvate?', answer: 'Sì, tutti i messaggi e i file condivisi vengono salvati e sono sempre ricercabili.' },
      { question: 'Posso disattivare le notifiche di un canale?', answer: 'Sì, puoi silenziare le notifiche di singoli canali o impostare orari di non disturbo.' },
    ],
    relatedModules: ['projects', 'support', 'content'],
  },
  {
    slug: 'support',
    number: 7,
    icon: LifeBuoy,
    title: 'Supporto & Ticket',
    subtitle: 'Gestione richieste di assistenza',
    description: `Il sistema di ticketing di ${brand.name} ti permette di gestire tutte le richieste di assistenza dei clienti in modo strutturato. Priorità, assegnazioni, workflow di risoluzione e storico completo per un supporto professionale ed efficiente.`,
    heroColor: '#f97316',
    videoUrl: `${STORAGE_URL}/08-support.mp4`,
    features: [
      { icon: Ticket, title: 'Lista ticket', description: 'Vista completa di tutti i ticket con filtri per stato, priorità, assegnatario e cliente.' },
      { icon: AlertTriangle, title: 'Priorità e SLA', description: 'Classifica i ticket per urgenza: bassa, media, alta, critica. Timer SLA per risposta e risoluzione.' },
      { icon: UserCheck, title: 'Assegnazione', description: 'Assegna i ticket al team member più adatto. Riassegnazione facile se serve un cambio.' },
      { icon: CheckCircle2, title: 'Workflow risoluzione', description: 'Ciclo completo: aperto → in lavorazione → in attesa → risolto → chiuso.' },
    ],
    workflow: [
      { step: 1, title: 'Il cliente apre il ticket', description: 'Il cliente può aprire un ticket via email, portale o direttamente dall\'app.', tip: 'I ticket via email vengono creati automaticamente.' },
      { step: 2, title: 'Triage e assegnazione', description: 'Classifica il ticket per priorità e assegnalo al team member più adatto.' },
      { step: 3, title: 'Lavora alla risoluzione', description: 'Comunica con il cliente nel thread del ticket. Aggiungi note interne per il team.' },
      { step: 4, title: 'Risolvi e chiudi', description: 'Quando il problema è risolto, cambia lo stato. Il cliente riceve notifica della risoluzione.' },
    ],
    tips: [
      'Assegna i ticket al team member con le competenze giuste',
      'Usa le priorità per gestire prima le urgenze critiche',
      'Aggiungi note interne per coordinare il team senza che il cliente le veda',
      'Monitora i ticket in stallo dalla dashboard per evitare ritardi',
      'Collega i ticket ai clienti CRM per contestualizzare le richieste',
    ],
    faq: [
      { question: 'Il cliente vede lo stato del ticket?', answer: 'Sì, il cliente può controllare lo stato del ticket in qualsiasi momento dal portale clienti.' },
      { question: 'Posso impostare risposte automatiche?', answer: 'Sì, puoi configurare template di risposta per le richieste più comuni e risposte automatiche all\'apertura del ticket.' },
      { question: 'Come funzionano le note interne?', answer: 'Le note interne sono visibili solo al team. Usa le per coordinare il lavoro sul ticket senza che il cliente le legga.' },
    ],
    relatedModules: ['crm', 'chat', 'projects'],
  },
  {
    slug: 'mobile',
    number: 8,
    icon: Smartphone,
    title: 'Mobile & PWA',
    subtitle: `${brand.name} ovunque`,
    description: `${brand.name} è completamente responsive e installabile come app sul tuo telefono grazie alla tecnologia PWA (Progressive Web App). Lavora ovunque: in ufficio dal desktop, in viaggio dal telefono, offline quando non hai connessione.`,
    heroColor: '#14b8a6',
    videoUrl: `${STORAGE_URL}/09-mobile.mp4`,
    features: [
      { icon: Smartphone, title: 'Design responsive', description: 'Ogni pagina si adatta perfettamente a schermi di ogni dimensione: desktop, tablet, smartphone.' },
      { icon: Download, title: 'Installa come app', description: `Aggiungi ${brand.name} alla home del telefono come un'app nativa. Nessun download dallo store.` },
      { icon: Menu, title: 'Navigazione mobile', description: 'Menu e sidebar ottimizzati per il touch con gesture naturali e accesso rapido.' },
      { icon: WifiOff, title: 'Supporto offline', description: 'Le pagine visitate di recente restano accessibili anche senza connessione.' },
    ],
    workflow: [
      { step: 1, title: 'Apri su mobile', description: `Vai all'indirizzo ${brand.name} dal browser del tuo smartphone (Chrome, Safari).`, tip: 'Funziona su qualsiasi smartphone moderno.' },
      { step: 2, title: 'Installa la PWA', description: 'Il browser ti proporrà di "Aggiungere alla schermata Home". Accetta per installare l\'app.' },
      { step: 3, title: 'Usa come un\'app', description: `${brand.name} si aprirà a schermo intero come un'app nativa con icona nella home.` },
      { step: 4, title: 'Lavora ovunque', description: 'Accedi a clienti, task, chat e ticket anche in mobilità. Le modifiche si sincronizzano automaticamente.' },
    ],
    tips: [
      'Installa la PWA per un accesso più rapido dalla home del telefono',
      'La PWA funziona come un\'app nativa ma senza occupare spazio nello store',
      'Usa la navigazione bottom bar su mobile per accedere rapidamente alle sezioni',
      'Le notifiche push funzionano anche dall\'app PWA installata',
      'In caso di connessione lenta, le pagine già caricate restano accessibili',
    ],
    faq: [
      { question: 'Devo scaricare un\'app dallo store?', answer: `No, ${brand.name} è una PWA. Si installa direttamente dal browser in pochi secondi, senza passare dall'App Store o dal Play Store.` },
      { question: 'Funziona offline?', answer: 'Le pagine visitate di recente sono disponibili offline grazie alla cache della PWA. Per dati aggiornati serve la connessione.' },
      { question: 'Le notifiche push funzionano su mobile?', answer: 'Sì, dopo aver installato la PWA e concesso i permessi, riceverai notifiche push come un\'app nativa.' },
    ],
    relatedModules: ['overview', 'chat', 'projects'],
  },
  {
    slug: 'admin',
    number: 9,
    icon: Shield,
    title: 'Admin & Configurazione',
    subtitle: 'Gestione utenti e impostazioni',
    description: `La sezione Admin è riservata ai gestori dell'account ${brand.name}. Da qui puoi gestire utenti, ruoli, permessi e tutte le impostazioni globali del sistema. Configura l'ambiente di lavoro perfetto per il tuo team.`,
    heroColor: '#ef4444',
    videoUrl: `${STORAGE_URL}/10-admin.mp4`,
    features: [
      { icon: UserCog, title: 'Gestione utenti', description: 'Crea, modifica e disattiva account utente. Gestisci password e accessi.' },
      { icon: Lock, title: 'Ruoli e permessi', description: 'Definisci ruoli (Admin, Staff, Viewer) con permessi granulari per ogni sezione.' },
      { icon: Palette, title: 'Personalizzazione', description: 'Logo, colori aziendali, nome organizzazione e impostazioni di branding.' },
      { icon: CardIcon, title: 'Digital card', description: 'Crea biglietti da visita digitali per ogni membro del team con QR code.' },
      { icon: Settings, title: 'Impostazioni globali', description: 'Notifiche, integrazioni, webhook, API e configurazioni avanzate del sistema.' },
    ],
    workflow: [
      { step: 1, title: 'Crea gli utenti', description: 'Dalla gestione utenti, crea un account per ogni membro del team con email e password.', tip: 'L\'utente riceverà un\'email di benvenuto con le credenziali.' },
      { step: 2, title: 'Assegna i ruoli', description: 'Assegna il ruolo appropriato: Admin per gestori, Staff per operativi, Viewer per sola consultazione.' },
      { step: 3, title: 'Configura i permessi', description: 'Personalizza i permessi per ruolo: chi può vedere, creare, modificare o eliminare in ogni sezione.' },
      { step: 4, title: 'Personalizza il branding', description: 'Carica il logo, imposta i colori aziendali e il nome dell\'organizzazione.' },
    ],
    tips: [
      'Crea ruoli personalizzati per gestire i permessi in modo granulare',
      'Disattiva gli account invece di eliminarli per mantenere lo storico',
      'Usa le digital card per un networking professionale e moderno',
      `Configura i webhook per integrare ${brand.name} con altri strumenti`,
      'Controlla periodicamente i log di accesso per la sicurezza',
    ],
    faq: [
      { question: 'Quanti utenti posso creare?', answer: 'Non c\'è un limite tecnico al numero di utenti. Il piano del tuo account determina il numero di utenti inclusi.' },
      { question: 'Posso creare ruoli personalizzati?', answer: 'Sì, oltre ai ruoli predefiniti (Admin, Staff, Viewer) puoi creare ruoli custom con permessi specifici per ogni sezione.' },
      { question: 'Come funziona la digital card?', answer: 'Ogni utente può avere un biglietto da visita digitale con foto, contatti e QR code. Si condivide con un link o scansionando il codice.' },
      { question: 'Posso recuperare un utente disattivato?', answer: 'Sì, gli utenti disattivati possono essere riattivati in qualsiasi momento dalla gestione utenti, con tutti i dati intatti.' },
    ],
    relatedModules: ['overview', 'support', 'projects'],
  },
]

export function getGuideBySlug(slug: string): GuideModule | undefined {
  return GUIDE_MODULES.find(m => m.slug === slug)
}

export function getAdjacentGuides(slug: string): { prev?: GuideModule; next?: GuideModule } {
  const idx = GUIDE_MODULES.findIndex(m => m.slug === slug)
  return {
    prev: idx > 0 ? GUIDE_MODULES[idx - 1] : undefined,
    next: idx < GUIDE_MODULES.length - 1 ? GUIDE_MODULES[idx + 1] : undefined,
  }
}
