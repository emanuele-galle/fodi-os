import { brand } from './branding'

// ─── Types ──────────────────────────────────────────────────

export interface ContractClause {
  title: string
  content: string
}

export interface ContractTemplate {
  id: string
  name: string
  description: string
  category: 'development' | 'maintenance' | 'consulting' | 'marketing' | 'hosting'
  clauses: ContractClause[]
}

// ─── Common Clauses ─────────────────────────────────────────

const CLAUSE_RISERVATEZZA: ContractClause = {
  title: 'RISERVATEZZA',
  content: `Le Parti si impegnano reciprocamente a mantenere strettamente riservate tutte le informazioni, i dati, i documenti, il know-how e qualsiasi altra informazione di natura tecnica, commerciale o finanziaria di cui vengano a conoscenza in occasione o in conseguenza dell'esecuzione del presente Contratto ("Informazioni Riservate").

L'obbligo di riservatezza permane per un periodo di 2 (due) anni dalla cessazione del Contratto, a qualsiasi titolo avvenuta.

Sono escluse dall'obbligo di riservatezza le informazioni che: (a) siano o diventino di pubblico dominio senza violazione del presente Contratto; (b) siano gia nella legittima disponibilita della Parte ricevente; (c) siano ricevute lecitamente da terzi senza vincolo di riservatezza; (d) debbano essere divulgate per obbligo di legge o per ordine dell'autorita giudiziaria.`,
}

const CLAUSE_PROTEZIONE_DATI: ContractClause = {
  title: 'PROTEZIONE DEI DATI PERSONALI',
  content: `Le Parti si impegnano a trattare i dati personali nel rispetto del Regolamento (UE) 2016/679 (GDPR) e del D.Lgs. 196/2003 e successive modificazioni.

${brand.companyUpper} tratta i dati personali del Cliente e dei suoi utenti esclusivamente per le finalita strettamente connesse all'esecuzione del presente Contratto, in qualita di Responsabile del trattamento ai sensi dell'art. 28 del GDPR.

Le Parti si impegnano a sottoscrivere, ove necessario, un separato accordo per il trattamento dei dati personali (DPA - Data Processing Agreement).`,
}

const CLAUSE_FORZA_MAGGIORE: ContractClause = {
  title: 'FORZA MAGGIORE',
  content: `Nessuna delle Parti sara responsabile per il mancato o ritardato adempimento delle obbligazioni derivanti dal presente Contratto qualora tale inadempimento o ritardo sia dovuto a cause di forza maggiore, intese come eventi imprevedibili e al di fuori del ragionevole controllo della Parte interessata, inclusi a titolo esemplificativo: calamita naturali, epidemie, atti di guerra o terrorismo, scioperi, provvedimenti della pubblica autorita, interruzioni prolungate di servizi essenziali (energia elettrica, telecomunicazioni).

La Parte colpita dall'evento di forza maggiore dovra darne tempestiva comunicazione scritta all'altra Parte, indicando la natura dell'evento e la durata stimata dell'impedimento. Qualora l'evento di forza maggiore si protragga per oltre 60 (sessanta) giorni consecutivi, ciascuna Parte avra diritto di recedere dal Contratto senza alcun onere aggiuntivo.`,
}

const CLAUSE_FORO: ContractClause = {
  title: 'FORO COMPETENTE E LEGGE APPLICABILE',
  content: `Il presente Contratto e regolato dalla legge italiana.

Per qualsiasi controversia derivante dall'interpretazione, esecuzione o risoluzione del presente Contratto, le Parti si impegnano a tentare una composizione amichevole entro 30 (trenta) giorni dalla comunicazione scritta della controversia.

In caso di mancata composizione amichevole, sara competente in via esclusiva il Foro di Vibo Valentia.`,
}

const CLAUSE_DISPOSIZIONI_FINALI: ContractClause = {
  title: 'DISPOSIZIONI FINALI',
  content: `Il presente Contratto costituisce l'intero accordo tra le Parti relativamente all'oggetto dello stesso e sostituisce ogni precedente intesa, accordo o dichiarazione, sia orale che scritta.

Eventuali modifiche o integrazioni al presente Contratto dovranno essere concordate per iscritto e sottoscritte da entrambe le Parti.

La nullita o inefficacia di una o piu clausole del presente Contratto non comporta la nullita o inefficacia delle rimanenti clausole, che conserveranno piena validita ed efficacia.

Il presente Contratto e redatto in duplice copia, una per ciascuna Parte.`,
}

const CLAUSE_LIMITAZIONE_RESPONSABILITA: ContractClause = {
  title: 'LIMITAZIONE DI RESPONSABILITA',
  content: `La responsabilita complessiva di ${brand.companyUpper} derivante dal presente Contratto, per qualsiasi causa e a qualsiasi titolo, non potra in nessun caso superare l'importo totale del corrispettivo effettivamente percepito nei 12 (dodici) mesi precedenti l'evento che ha dato origine alla responsabilita.

${brand.companyUpper} non sara in alcun caso responsabile per danni indiretti, incidentali, consequenziali, punitivi o speciali, inclusi a titolo esemplificativo: perdita di profitto, perdita di dati, interruzione dell'attivita, danni reputazionali, anche qualora sia stata informata della possibilita di tali danni.

Le limitazioni di cui sopra non si applicano in caso di dolo o colpa grave.`,
}

// ─── Contract Templates ─────────────────────────────────────

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'sviluppo-software',
    name: 'Contratto di Sviluppo Software',
    description: 'Contratto per lo sviluppo di software, applicazioni web, mobile e piattaforme digitali personalizzate.',
    category: 'development',
    clauses: [
      {
        title: 'PREMESSE',
        content: `- ${brand.companyUpper} (di seguito "Fornitore") e una societa specializzata nello sviluppo di soluzioni software, applicazioni web e piattaforme digitali.
- Il Cliente intende affidare al Fornitore lo sviluppo di un progetto software secondo le specifiche tecniche concordate.
- Le Parti intendono regolare i reciproci diritti e obblighi con il presente Contratto.`,
      },
      {
        title: 'OGGETTO DEL CONTRATTO',
        content: `Il presente Contratto ha ad oggetto la progettazione, lo sviluppo e la consegna da parte del Fornitore del software/applicazione descritto nell'Allegato A ("Specifiche Tecniche"), che costituisce parte integrante del presente Contratto.

Il progetto comprende le seguenti fasi:
a) Analisi dei requisiti e progettazione funzionale
b) Progettazione tecnica e architetturale
c) Sviluppo e implementazione
d) Testing e Quality Assurance
e) Deployment in ambiente di produzione
f) Formazione e consegna documentazione

Le specifiche tecniche dettagliate, i requisiti funzionali e le milestone di progetto sono definiti nell'Allegato A.`,
      },
      {
        title: 'OBBLIGHI DEL FORNITORE',
        content: `Il Fornitore si impegna a:
a) Eseguire il progetto con diligenza professionale, nel rispetto delle specifiche tecniche concordate e delle best practices di settore.
b) Rispettare le tempistiche indicate nel cronoprogramma (Allegato B), salvo cause di forza maggiore o ritardi imputabili al Cliente.
c) Fornire aggiornamenti periodici sullo stato di avanzamento del progetto con cadenza almeno bisettimanale.
d) Garantire la correzione di bug e malfunzionamenti per un periodo di 90 (novanta) giorni dalla data di consegna definitiva ("Periodo di Garanzia"), senza costi aggiuntivi.
e) Fornire il codice sorgente e la documentazione tecnica alla consegna del progetto.
f) Garantire la conformita del software alle normative vigenti in materia di accessibilita (ove applicabile) e sicurezza informatica.`,
      },
      {
        title: 'OBBLIGHI DEL CLIENTE',
        content: `Il Cliente si impegna a:
a) Fornire tempestivamente al Fornitore tutti i materiali, le informazioni, i contenuti e gli accessi necessari per l'esecuzione del progetto.
b) Designare un referente unico per le comunicazioni e le decisioni relative al progetto.
c) Esaminare e approvare i deliverable entro 10 (dieci) giorni lavorativi dalla consegna di ciascuna milestone. In assenza di riscontro entro tale termine, i deliverable si intenderanno tacitamente approvati.
d) Corrispondere il corrispettivo nei termini e con le modalita previste dal presente Contratto.

Ritardi nella fornitura dei materiali o nelle approvazioni da parte del Cliente comporteranno un pari slittamento delle tempistiche di consegna.`,
      },
      {
        title: 'CORRISPETTIVO E MODALITA DI PAGAMENTO',
        content: `Il corrispettivo per i servizi oggetto del presente Contratto e stabilito in EUR ________ (________/00) + IVA, come dettagliato nell'Allegato C ("Preventivo Economico").

Il pagamento sara effettuato secondo le seguenti modalita:
- 30% (trenta per cento) alla firma del presente Contratto, a titolo di anticipo
- 40% (quaranta per cento) al completamento delle milestone intermedie come da Allegato B
- 30% (trenta per cento) alla consegna e approvazione finale del progetto

I pagamenti dovranno essere effettuati entro 30 (trenta) giorni dalla data di emissione della relativa fattura, tramite bonifico bancario sul conto corrente indicato in fattura.

In caso di ritardato pagamento, saranno applicati gli interessi moratori nella misura prevista dal D.Lgs. 231/2002.`,
      },
      {
        title: 'REVISIONI E MODIFICHE',
        content: `Sono incluse nel corrispettivo fino a 2 (due) cicli di revisione per ciascuna fase del progetto. Per "revisione" si intende un insieme organico di feedback e correzioni presentato in un'unica comunicazione.

Revisioni aggiuntive o modifiche che comportino una variazione significativa delle specifiche tecniche originali saranno oggetto di un preventivo separato ("Change Request"), che dovra essere approvato dal Cliente prima dell'inizio dei lavori.

Le Change Request non modificano le condizioni del presente Contratto, ma ne integrano il contenuto come Allegati aggiuntivi.`,
      },
      {
        title: 'PROPRIETA INTELLETTUALE',
        content: `Al pagamento integrale del corrispettivo, tutti i diritti di proprieta intellettuale sui deliverable specificamente sviluppati per il Cliente nell'ambito del presente Contratto saranno trasferiti al Cliente.

Restano di esclusiva proprieta del Fornitore:
a) I framework, le librerie, i tool e i componenti software preesistenti o di uso generale utilizzati nel progetto.
b) Le metodologie, i processi e il know-how sviluppati o utilizzati dal Fornitore.

Il Fornitore concede al Cliente una licenza perpetua, non esclusiva e gratuita per l'utilizzo dei componenti di cui al punto precedente, limitatamente al progetto oggetto del presente Contratto.

Il Fornitore si riserva il diritto di menzionare il progetto nel proprio portfolio e materiale promozionale, salvo diverso accordo scritto.`,
      },
      {
        title: 'DURATA E RECESSO',
        content: `Il presente Contratto ha efficacia dalla data di sottoscrizione e si intende completato con la consegna e l'approvazione finale del progetto, fatte salve le obbligazioni di garanzia.

Ciascuna Parte potra recedere dal presente Contratto con preavviso scritto di almeno 30 (trenta) giorni, tramite comunicazione via PEC o raccomandata A/R.

In caso di recesso da parte del Cliente:
- Saranno fatturate tutte le attivita gia completate fino alla data di efficacia del recesso.
- L'anticipo versato non sara rimborsato.
- Il Fornitore consegnera al Cliente tutti i deliverable completati fino a quel momento.

In caso di recesso da parte del Fornitore:
- Il Fornitore restituira l'eventuale anticipo non ancora utilizzato.
- Il Fornitore consegnera al Cliente tutti i deliverable completati fino a quel momento.`,
      },
      CLAUSE_RISERVATEZZA,
      CLAUSE_PROTEZIONE_DATI,
      CLAUSE_LIMITAZIONE_RESPONSABILITA,
      CLAUSE_FORZA_MAGGIORE,
      CLAUSE_FORO,
      CLAUSE_DISPOSIZIONI_FINALI,
    ],
  },

  {
    id: 'manutenzione-assistenza',
    name: 'Contratto di Manutenzione e Assistenza Tecnica',
    description: 'Contratto per servizi continuativi di manutenzione software, aggiornamenti, monitoraggio e assistenza tecnica.',
    category: 'maintenance',
    clauses: [
      {
        title: 'PREMESSE',
        content: `- ${brand.companyUpper} (di seguito "Fornitore") e una societa specializzata nella manutenzione e assistenza di soluzioni software e infrastrutture digitali.
- Il Cliente dispone di un sistema software/piattaforma digitale che necessita di manutenzione continuativa, aggiornamenti e assistenza tecnica.
- Le Parti intendono regolare le condizioni per l'erogazione dei servizi di manutenzione e assistenza con il presente Contratto.`,
      },
      {
        title: 'OGGETTO DEL CONTRATTO',
        content: `Il presente Contratto ha ad oggetto l'erogazione da parte del Fornitore dei seguenti servizi di manutenzione e assistenza tecnica relativi ai sistemi del Cliente:

a) MANUTENZIONE CORRETTIVA: Correzione di bug, malfunzionamenti e anomalie del software. Intervento entro 24 ore lavorative dalla segnalazione per problemi critici, entro 72 ore per problemi non critici.

b) MANUTENZIONE EVOLUTIVA: Aggiornamenti minori, piccole migliorie funzionali e adeguamento a nuove versioni delle dipendenze software. Incluse fino a ________ ore/mese di sviluppo evolutivo.

c) MANUTENZIONE PREVENTIVA: Aggiornamenti di sicurezza, ottimizzazione delle performance, monitoraggio proattivo dell'infrastruttura e backup periodici.

d) ASSISTENZA TECNICA: Supporto tecnico via email/ticket durante gli orari lavorativi (Lun-Ven 9:00-18:00). Tempo di prima risposta: entro 4 ore lavorative.

I sistemi oggetto di manutenzione sono elencati nell'Allegato A.`,
      },
      {
        title: 'LIVELLI DI SERVIZIO (SLA)',
        content: `Il Fornitore garantisce i seguenti livelli di servizio:

DISPONIBILITA: Uptime minimo del 99.5% su base mensile, calcolato escludendo le finestre di manutenzione programmata.

TEMPI DI RISPOSTA:
- Priorita Critica (sistema non operativo): prima risposta entro 2 ore, risoluzione entro 8 ore lavorative
- Priorita Alta (funzionalita importante compromessa): prima risposta entro 4 ore, risoluzione entro 24 ore lavorative
- Priorita Media (malfunzionamento parziale): prima risposta entro 8 ore, risoluzione entro 48 ore lavorative
- Priorita Bassa (richieste migliorative): prima risposta entro 24 ore, pianificazione concordata

MANUTENZIONE PROGRAMMATA: Le attivita di manutenzione programmata saranno comunicate con almeno 48 ore di anticipo e, ove possibile, eseguite in orari di minor utilizzo del sistema.

REPORTING: Report mensile sullo stato dei sistemi, interventi effettuati, SLA rispettati e raccomandazioni.`,
      },
      {
        title: 'OBBLIGHI DEL FORNITORE',
        content: `Il Fornitore si impegna a:
a) Erogare i servizi con diligenza professionale e nel rispetto degli SLA concordati.
b) Mantenere personale tecnico qualificato per la gestione dei sistemi del Cliente.
c) Eseguire backup regolari dei sistemi e verificarne periodicamente l'integrita.
d) Notificare tempestivamente il Cliente in caso di incidenti di sicurezza o malfunzionamenti critici.
e) Fornire report mensili dettagliati sulle attivita svolte.
f) Mantenere aggiornata la documentazione tecnica dei sistemi.`,
      },
      {
        title: 'OBBLIGHI DEL CLIENTE',
        content: `Il Cliente si impegna a:
a) Garantire al Fornitore gli accessi necessari ai sistemi oggetto di manutenzione.
b) Segnalare tempestivamente eventuali anomalie o malfunzionamenti attraverso i canali concordati.
c) Non apportare modifiche ai sistemi senza preventiva comunicazione al Fornitore.
d) Corrispondere il corrispettivo nei termini previsti dal presente Contratto.
e) Collaborare con il Fornitore per la risoluzione dei problemi, fornendo le informazioni richieste.`,
      },
      {
        title: 'CORRISPETTIVO E MODALITA DI PAGAMENTO',
        content: `Il corrispettivo per i servizi di manutenzione e assistenza e stabilito in EUR ________ (________/00) + IVA mensili / annuali.

Il pagamento sara effettuato con cadenza mensile / trimestrale / annuale anticipata, entro 30 (trenta) giorni dalla data di emissione della relativa fattura, tramite bonifico bancario.

Le ore di sviluppo evolutivo eccedenti il monte ore mensile incluso saranno fatturate separatamente alla tariffa oraria di EUR ________ + IVA.

Il corrispettivo sara rivalutato annualmente in base all'indice ISTAT dei prezzi al consumo, con un incremento minimo dello 0% e massimo del 5%.`,
      },
      {
        title: 'DURATA, RINNOVO E RECESSO',
        content: `Il presente Contratto ha durata di 12 (dodici) mesi a decorrere dalla data di sottoscrizione.

Il Contratto si rinnova tacitamente per periodi successivi di pari durata, salvo disdetta comunicata da una delle Parti con preavviso di almeno 60 (sessanta) giorni prima della scadenza, tramite PEC o raccomandata A/R.

In caso di recesso anticipato da parte del Cliente senza giusta causa, il Cliente sara tenuto al pagamento del corrispettivo residuo fino alla naturale scadenza del periodo contrattuale in corso.

Costituisce giusta causa di recesso, tra le altre: (a) grave inadempimento degli obblighi contrattuali non sanato entro 30 giorni dalla contestazione scritta; (b) procedura concorsuale a carico di una delle Parti.`,
      },
      CLAUSE_RISERVATEZZA,
      CLAUSE_PROTEZIONE_DATI,
      CLAUSE_LIMITAZIONE_RESPONSABILITA,
      CLAUSE_FORZA_MAGGIORE,
      CLAUSE_FORO,
      CLAUSE_DISPOSIZIONI_FINALI,
    ],
  },

  {
    id: 'consulenza-digitale',
    name: 'Contratto di Consulenza Digitale',
    description: 'Contratto per servizi di consulenza strategica digitale, trasformazione digitale, analisi e advisory.',
    category: 'consulting',
    clauses: [
      {
        title: 'PREMESSE',
        content: `- ${brand.companyUpper} (di seguito "Consulente") e una societa specializzata in consulenza strategica digitale, trasformazione digitale e innovazione tecnologica.
- Il Cliente intende avvalersi della competenza del Consulente per l'analisi, la progettazione e l'implementazione di strategie digitali.
- Le Parti intendono regolare le condizioni della consulenza con il presente Contratto.`,
      },
      {
        title: 'OGGETTO DEL CONTRATTO',
        content: `Il presente Contratto ha ad oggetto la prestazione da parte del Consulente di servizi di consulenza digitale, come di seguito specificati:

a) Analisi dello stato attuale dei processi e delle tecnologie digitali del Cliente
b) Definizione della strategia digitale e roadmap di trasformazione
c) Individuazione e valutazione di soluzioni tecnologiche appropriate
d) Supporto nella selezione e implementazione di piattaforme e strumenti digitali
e) Formazione del personale sulle nuove tecnologie e processi
f) Monitoraggio dei risultati e ottimizzazione continua

Il perimetro dettagliato dell'incarico, gli obiettivi e i KPI sono definiti nell'Allegato A ("Scope of Work").`,
      },
      {
        title: 'MODALITA DI ESECUZIONE',
        content: `I servizi di consulenza saranno erogati secondo le seguenti modalita:
a) Incontri periodici (in presenza e/o da remoto) con cadenza concordata tra le Parti.
b) Analisi e reportistica scritta secondo le milestone definite nell'Allegato A.
c) Supporto continuativo via email e strumenti di comunicazione concordati.
d) Disponibilita di un monte ore mensile di ________ ore, di cui fino a ________ ore per interventi urgenti.

Il Consulente svolgera l'incarico in piena autonomia organizzativa, utilizzando i propri strumenti e metodologie professionali, nel rispetto delle indicazioni strategiche del Cliente.`,
      },
      {
        title: 'OBBLIGHI DEL CONSULENTE',
        content: `Il Consulente si impegna a:
a) Svolgere l'incarico con diligenza, competenza e professionalita, nel rispetto dei piu elevati standard del settore.
b) Rispettare le tempistiche concordate per la consegna dei deliverable.
c) Mantenere riservate tutte le informazioni relative all'attivita del Cliente.
d) Segnalare tempestivamente al Cliente eventuali criticita, rischi o opportunita rilevanti.
e) Fornire report periodici sullo stato di avanzamento delle attivita.
f) Garantire la propria disponibilita per incontri e riunioni secondo il calendario concordato.`,
      },
      {
        title: 'OBBLIGHI DEL CLIENTE',
        content: `Il Cliente si impegna a:
a) Fornire al Consulente tutte le informazioni, i dati e gli accessi necessari per lo svolgimento dell'incarico.
b) Designare un referente interno con potere decisionale per facilitare il processo di consulenza.
c) Collaborare attivamente nell'implementazione delle soluzioni proposte.
d) Corrispondere il corrispettivo nei termini e con le modalita previste dal presente Contratto.
e) Non divulgare a terzi le metodologie e gli strumenti proprietari del Consulente.`,
      },
      {
        title: 'CORRISPETTIVO E MODALITA DI PAGAMENTO',
        content: `Il corrispettivo per i servizi di consulenza e determinato come segue:

OPZIONE A - A PROGETTO:
Corrispettivo fisso di EUR ________ (________/00) + IVA per l'intero incarico, da corrispondere secondo le milestone definite nell'Allegato B.

OPZIONE B - A TEMPO:
Tariffa oraria/giornaliera di EUR ________ + IVA, con un monte ore massimo di ________ ore/mese. Fatturazione mensile a consuntivo sulla base delle ore effettivamente erogate e documentate nel timesheet approvato dal Cliente.

I pagamenti dovranno essere effettuati entro 30 (trenta) giorni dalla data di emissione della relativa fattura, tramite bonifico bancario.`,
      },
      {
        title: 'DURATA E RECESSO',
        content: `Il presente Contratto ha durata di ________ mesi a decorrere dalla data di sottoscrizione.

Ciascuna Parte potra recedere dal Contratto con preavviso scritto di almeno 30 (trenta) giorni, tramite PEC o raccomandata A/R.

In caso di recesso:
- Saranno fatturate tutte le attivita gia completate e le ore gia erogate fino alla data di efficacia del recesso.
- Il Consulente consegnera al Cliente tutta la documentazione e i deliverable prodotti fino a quel momento.
- Eventuali anticipi non ancora utilizzati saranno restituiti.`,
      },
      {
        title: 'PROPRIETA INTELLETTUALE',
        content: `I deliverable specificamente prodotti per il Cliente nell'ambito del presente incarico (report, analisi, strategie, documentazione) sono di proprieta del Cliente al pagamento integrale del corrispettivo.

Restano di esclusiva proprieta del Consulente le metodologie, i framework di analisi, i template e gli strumenti utilizzati nello svolgimento dell'incarico.

Il Consulente si riserva il diritto di riutilizzare le conoscenze e competenze generali acquisite nell'ambito dell'incarico, purche in forma anonimizzata.`,
      },
      CLAUSE_RISERVATEZZA,
      CLAUSE_PROTEZIONE_DATI,
      CLAUSE_LIMITAZIONE_RESPONSABILITA,
      CLAUSE_FORZA_MAGGIORE,
      CLAUSE_FORO,
      CLAUSE_DISPOSIZIONI_FINALI,
    ],
  },

  {
    id: 'social-media-management',
    name: 'Contratto di Social Media Management',
    description: 'Contratto per la gestione professionale dei canali social media, content creation, community management e advertising.',
    category: 'marketing',
    clauses: [
      {
        title: 'PREMESSE',
        content: `- ${brand.companyUpper} (di seguito "Agenzia") e una societa specializzata nella gestione di strategie di comunicazione digitale e social media marketing.
- Il Cliente intende affidare all'Agenzia la gestione professionale dei propri canali social media.
- Le Parti intendono regolare le condizioni del servizio con il presente Contratto.`,
      },
      {
        title: 'OGGETTO DEL CONTRATTO',
        content: `Il presente Contratto ha ad oggetto la gestione da parte dell'Agenzia dei canali social media del Cliente, come di seguito specificato:

CANALI GESTITI: ________________________ (es. Instagram, Facebook, LinkedIn, TikTok)

SERVIZI INCLUSI:
a) Elaborazione della strategia editoriale mensile
b) Creazione di contenuti originali (testi, grafiche, foto, video brevi) secondo il piano editoriale approvato
c) Pubblicazione e programmazione dei contenuti: minimo ________ post/settimana per canale
d) Community management: monitoraggio e risposta a commenti e messaggi diretti nei giorni lavorativi
e) Gestione e ottimizzazione di campagne advertising (budget pubblicitario a carico del Cliente)
f) Report mensile con analisi delle performance, KPI e raccomandazioni strategiche

Il piano editoriale mensile sara presentato entro il giorno 25 del mese precedente e dovra essere approvato dal Cliente entro 3 giorni lavorativi.`,
      },
      {
        title: 'OBBLIGHI DELL\'AGENZIA',
        content: `L'Agenzia si impegna a:
a) Creare contenuti di alta qualita, coerenti con l'identita visiva e il tono di voce del brand del Cliente.
b) Rispettare il piano editoriale approvato e le tempistiche di pubblicazione.
c) Monitorare i canali e rispondere ai commenti/messaggi entro 12 ore lavorative.
d) Gestire eventuali crisi reputazionali secondo il protocollo concordato con il Cliente.
e) Utilizzare esclusivamente immagini e contenuti di cui si detengono i diritti d'uso.
f) Fornire report mensili dettagliati entro il 5 del mese successivo.
g) Partecipare a un incontro mensile di allineamento strategico con il Cliente.`,
      },
      {
        title: 'OBBLIGHI DEL CLIENTE',
        content: `Il Cliente si impegna a:
a) Fornire all'Agenzia le credenziali di accesso ai canali social e gli strumenti necessari.
b) Approvare tempestivamente il piano editoriale e i contenuti sottoposti a revisione.
c) Fornire materiale fotografico, video e informazioni necessarie per la creazione dei contenuti.
d) Comunicare tempestivamente eventuali novita, eventi o promozioni da includere nella comunicazione.
e) Mettere a disposizione il budget pubblicitario concordato per le campagne advertising.
f) Corrispondere il corrispettivo nei termini previsti dal presente Contratto.

In caso di mancata approvazione del piano editoriale entro i termini, l'Agenzia procedera con la pubblicazione del piano proposto.`,
      },
      {
        title: 'CORRISPETTIVO E MODALITA DI PAGAMENTO',
        content: `Il corrispettivo per i servizi di social media management e stabilito in EUR ________ (________/00) + IVA mensili.

Il budget pubblicitario per le campagne advertising e a carico del Cliente e non e incluso nel corrispettivo sopra indicato. Il budget minimo consigliato e di EUR ________ /mese.

Il pagamento sara effettuato con cadenza mensile anticipata, entro il giorno 5 di ogni mese, tramite bonifico bancario.

Servizi aggiuntivi non inclusi nel presente Contratto (shooting fotografici professionali, produzioni video complesse, influencer marketing) saranno quotati separatamente.`,
      },
      {
        title: 'PROPRIETA INTELLETTUALE E CONTENUTI',
        content: `I contenuti originali creati dall'Agenzia specificamente per i canali del Cliente (testi, grafiche, creativita) sono di proprieta del Cliente al pagamento del relativo corrispettivo.

Restano di proprieta dell'Agenzia i template, i format editoriali e le metodologie utilizzati.

Il Cliente garantisce di detenere tutti i diritti necessari sui materiali forniti all'Agenzia (marchi, foto, video). Il Cliente manleva l'Agenzia da qualsiasi pretesa di terzi relativa ai materiali forniti.

L'Agenzia si riserva il diritto di includere i contenuti prodotti nel proprio portfolio professionale.`,
      },
      {
        title: 'DURATA, RINNOVO E RECESSO',
        content: `Il presente Contratto ha durata di ________ mesi a decorrere dalla data di sottoscrizione, con un periodo minimo di impegno di 3 (tre) mesi.

Il Contratto si rinnova tacitamente per periodi di 3 (tre) mesi, salvo disdetta comunicata da una delle Parti con preavviso di almeno 30 (trenta) giorni prima della scadenza, tramite PEC o raccomandata A/R.

In caso di recesso anticipato durante il periodo minimo di impegno, il Cliente sara tenuto al pagamento del corrispettivo residuo fino alla scadenza del periodo minimo.

Alla cessazione del Contratto, l'Agenzia restituira al Cliente tutte le credenziali di accesso ai canali social e trasferira la proprieta degli eventuali account pubblicitari creati.`,
      },
      CLAUSE_RISERVATEZZA,
      CLAUSE_PROTEZIONE_DATI,
      CLAUSE_LIMITAZIONE_RESPONSABILITA,
      CLAUSE_FORO,
      CLAUSE_DISPOSIZIONI_FINALI,
    ],
  },

  {
    id: 'seo-marketing-digitale',
    name: 'Contratto SEO e Marketing Digitale',
    description: 'Contratto per servizi di ottimizzazione SEO, advertising digitale, content marketing e lead generation.',
    category: 'marketing',
    clauses: [
      {
        title: 'PREMESSE',
        content: `- ${brand.companyUpper} (di seguito "Agenzia") e una societa specializzata in strategie di marketing digitale, ottimizzazione per i motori di ricerca (SEO) e advertising online.
- Il Cliente intende migliorare la propria visibilita online e generare opportunita commerciali attraverso strategie di marketing digitale.
- Le Parti intendono regolare le condizioni del servizio con il presente Contratto.`,
      },
      {
        title: 'OGGETTO DEL CONTRATTO',
        content: `Il presente Contratto ha ad oggetto l'erogazione da parte dell'Agenzia dei seguenti servizi di marketing digitale:

a) SEO (Search Engine Optimization):
   - Audit SEO tecnico completo del sito web
   - Ricerca keyword e analisi della concorrenza
   - Ottimizzazione on-page (meta tag, struttura URL, contenuti, schema markup)
   - Ottimizzazione tecnica (velocita, mobile, Core Web Vitals)
   - Strategia di link building e digital PR
   - Monitoraggio posizionamenti e reportistica

b) CONTENT MARKETING:
   - Creazione di ________ articoli/contenuti ottimizzati SEO al mese
   - Ottimizzazione dei contenuti esistenti
   - Strategia di content marketing e calendario editoriale

c) ADVERTISING DIGITALE (se incluso):
   - Gestione campagne Google Ads / Meta Ads / LinkedIn Ads
   - Ottimizzazione continua delle campagne
   - A/B testing creativita e landing page

d) ANALYTICS E REPORTING:
   - Setup e configurazione Google Analytics 4 e Google Search Console
   - Report mensile con KPI, trend e raccomandazioni

I KPI e gli obiettivi specifici sono definiti nell'Allegato A.`,
      },
      {
        title: 'DISCLAIMER SUI RISULTATI',
        content: `Le Parti riconoscono e concordano che:

a) Il posizionamento sui motori di ricerca e determinato da algoritmi complessi e in continua evoluzione, il cui funzionamento non e interamente prevedibile ne controllabile.
b) L'Agenzia si impegna a utilizzare le migliori pratiche del settore ("white hat SEO") per migliorare il posizionamento del sito del Cliente, ma NON PUO' GARANTIRE il raggiungimento di specifiche posizioni nei risultati di ricerca ne specifici volumi di traffico.
c) I risultati delle attivita SEO richiedono tipicamente un periodo di 3-6 mesi per manifestarsi in modo significativo.
d) L'Agenzia non utilizzera in alcun caso tecniche manipolative o "black hat" che possano esporre il sito del Cliente a penalizzazioni.
e) Eventuali modifiche agli algoritmi dei motori di ricerca possono influire temporaneamente sui risultati.`,
      },
      {
        title: 'OBBLIGHI DELL\'AGENZIA',
        content: `L'Agenzia si impegna a:
a) Svolgere le attivita con competenza professionale, utilizzando esclusivamente tecniche conformi alle linee guida dei motori di ricerca.
b) Fornire report mensili dettagliati sulle attivita svolte, i risultati ottenuti e le azioni pianificate.
c) Comunicare tempestivamente al Cliente eventuali problematiche tecniche o penalizzazioni rilevate.
d) Gestire il budget pubblicitario con attenzione e trasparenza, rendicontando le spese effettive.
e) Mantenere aggiornate le proprie competenze sugli aggiornamenti degli algoritmi e le best practices.`,
      },
      {
        title: 'OBBLIGHI DEL CLIENTE',
        content: `Il Cliente si impegna a:
a) Fornire all'Agenzia gli accessi necessari (CMS, Google Analytics, Search Console, account pubblicitari).
b) Non apportare modifiche al sito web che possano interferire con le attivita SEO senza preventiva comunicazione all'Agenzia.
c) Approvare i contenuti proposti entro 5 giorni lavorativi dalla presentazione.
d) Fornire informazioni accurate sui propri prodotti/servizi per la creazione dei contenuti.
e) Mettere a disposizione il budget pubblicitario concordato per le campagne advertising.
f) Corrispondere il corrispettivo nei termini previsti dal presente Contratto.`,
      },
      {
        title: 'CORRISPETTIVO E MODALITA DI PAGAMENTO',
        content: `Il corrispettivo per i servizi di marketing digitale e stabilito in EUR ________ (________/00) + IVA mensili.

Il budget pubblicitario per le campagne advertising e a carico del Cliente e non e incluso nel corrispettivo. Il budget minimo consigliato e di EUR ________ /mese.

Il pagamento sara effettuato con cadenza mensile anticipata, entro 30 (trenta) giorni dalla data di emissione della fattura, tramite bonifico bancario.

La fee di gestione campagne advertising e pari al ________% del budget pubblicitario gestito, con un minimo di EUR ________ /mese.`,
      },
      {
        title: 'DURATA, RINNOVO E RECESSO',
        content: `Il presente Contratto ha durata di 12 (dodici) mesi a decorrere dalla data di sottoscrizione, con un periodo minimo di impegno di 6 (sei) mesi, necessario per l'ottenimento di risultati significativi nelle attivita SEO.

Il Contratto si rinnova tacitamente per periodi successivi di 6 (sei) mesi, salvo disdetta comunicata da una delle Parti con preavviso di almeno 60 (sessanta) giorni prima della scadenza.

In caso di recesso anticipato durante il periodo minimo di impegno, il Cliente sara tenuto al pagamento del corrispettivo residuo fino alla scadenza del periodo minimo.

Alla cessazione del Contratto, l'Agenzia trasferira al Cliente la proprieta di tutti gli account, profili e strumenti creati nell'ambito delle attivita oggetto del Contratto.`,
      },
      CLAUSE_RISERVATEZZA,
      CLAUSE_LIMITAZIONE_RESPONSABILITA,
      CLAUSE_FORO,
      CLAUSE_DISPOSIZIONI_FINALI,
    ],
  },

  {
    id: 'hosting-gestione-server',
    name: 'Contratto di Hosting e Gestione Server',
    description: 'Contratto per servizi di hosting gestito, amministrazione server, monitoraggio infrastruttura e backup.',
    category: 'hosting',
    clauses: [
      {
        title: 'PREMESSE',
        content: `- ${brand.companyUpper} (di seguito "Fornitore") e una societa specializzata in servizi di hosting gestito e amministrazione di infrastrutture server.
- Il Cliente necessita di un servizio di hosting affidabile e gestito per le proprie applicazioni web e/o servizi digitali.
- Le Parti intendono regolare le condizioni del servizio con il presente Contratto.`,
      },
      {
        title: 'OGGETTO DEL CONTRATTO',
        content: `Il presente Contratto ha ad oggetto l'erogazione da parte del Fornitore dei seguenti servizi di hosting e gestione server:

a) HOSTING GESTITO:
   - Infrastruttura server dedicata/condivisa come da specifica nell'Allegato A
   - Risorse computazionali: CPU, RAM, storage SSD come da piano scelto
   - Banda di rete e traffico come da specifica
   - Certificati SSL/TLS con rinnovo automatico

b) AMMINISTRAZIONE SERVER:
   - Configurazione e ottimizzazione del sistema operativo e del web server
   - Gestione DNS e configurazione domini
   - Installazione e aggiornamento software di base
   - Hardening di sicurezza e configurazione firewall

c) MONITORAGGIO:
   - Monitoraggio 24/7 dello stato del server e dei servizi
   - Alert automatici in caso di anomalie o downtime
   - Intervento tempestivo in caso di problemi critici

d) BACKUP E DISASTER RECOVERY:
   - Backup automatici giornalieri con retention di 30 giorni
   - Backup settimanali con retention di 90 giorni
   - Procedura di disaster recovery testata periodicamente

Le specifiche tecniche dell'infrastruttura sono dettagliate nell'Allegato A.`,
      },
      {
        title: 'LIVELLI DI SERVIZIO (SLA)',
        content: `Il Fornitore garantisce i seguenti livelli di servizio:

DISPONIBILITA INFRASTRUTTURA: Uptime garantito del 99.9% su base mensile, calcolato escludendo le finestre di manutenzione programmata e gli eventi di forza maggiore.

TEMPI DI INTERVENTO:
- Downtime completo: intervento entro 30 minuti, ripristino entro 4 ore
- Degradazione performance: intervento entro 2 ore, risoluzione entro 8 ore
- Problemi non critici: intervento entro 8 ore lavorative

PENALI:
In caso di mancato rispetto dell'SLA di disponibilita, il Cliente avra diritto a un credito calcolato come segue:
- Uptime 99.0% - 99.9%: credito del 10% del canone mensile
- Uptime 98.0% - 99.0%: credito del 25% del canone mensile
- Uptime < 98.0%: credito del 50% del canone mensile

I crediti non sono cumulabili e non possono superare il 50% del canone mensile.

MANUTENZIONE PROGRAMMATA: Comunicata con almeno 72 ore di anticipo e schedulata in orari di minor traffico (tipicamente 02:00-06:00 CET).`,
      },
      {
        title: 'OBBLIGHI DEL FORNITORE',
        content: `Il Fornitore si impegna a:
a) Mantenere l'infrastruttura operativa nel rispetto degli SLA concordati.
b) Eseguire backup regolari e verificarne periodicamente l'integrita e la ripristinabilita.
c) Applicare tempestivamente le patch di sicurezza critiche (entro 24 ore dalla pubblicazione).
d) Monitorare proattivamente lo stato dell'infrastruttura e intervenire in caso di anomalie.
e) Fornire supporto tecnico per la risoluzione di problematiche relative all'infrastruttura.
f) Mantenere aggiornata la documentazione dell'infrastruttura.
g) Notificare tempestivamente il Cliente in caso di incidenti di sicurezza.`,
      },
      {
        title: 'OBBLIGHI DEL CLIENTE',
        content: `Il Cliente si impegna a:
a) Non modificare la configurazione del server senza preventivo accordo con il Fornitore.
b) Utilizzare l'infrastruttura nel rispetto delle leggi vigenti e delle policy di utilizzo accettabile.
c) Mantenere aggiornate le proprie applicazioni e non utilizzare software vulnerabile.
d) Comunicare tempestivamente eventuali variazioni nelle esigenze di risorse o traffico.
e) Corrispondere il corrispettivo nei termini previsti dal presente Contratto.
f) Non utilizzare l'infrastruttura per attivita illegali, spam, phishing o distribuzione di malware.`,
      },
      {
        title: 'CORRISPETTIVO E MODALITA DI PAGAMENTO',
        content: `Il corrispettivo per i servizi di hosting e gestione server e stabilito in EUR ________ (________/00) + IVA mensili / annuali.

Il pagamento sara effettuato con cadenza mensile / annuale anticipata, entro 30 (trenta) giorni dalla data di emissione della fattura, tramite bonifico bancario.

Il pagamento annuale anticipato prevede uno sconto del 10% sul corrispettivo totale.

Servizi aggiuntivi (migrazione, scaling, interventi straordinari) saranno quotati separatamente alla tariffa oraria di EUR ________ + IVA.

In caso di mancato pagamento entro 60 giorni dalla scadenza, il Fornitore si riserva il diritto di sospendere il servizio con preavviso scritto di 15 giorni, previa notifica della morosita.`,
      },
      {
        title: 'DURATA, RINNOVO E RECESSO',
        content: `Il presente Contratto ha durata di 12 (dodici) mesi a decorrere dalla data di attivazione del servizio.

Il Contratto si rinnova tacitamente per periodi successivi di 12 (dodici) mesi, salvo disdetta comunicata da una delle Parti con preavviso di almeno 90 (novanta) giorni prima della scadenza.

In caso di recesso anticipato, il Cliente sara tenuto al pagamento del corrispettivo residuo fino alla naturale scadenza del periodo contrattuale in corso.

MIGRAZIONE DATI: Alla cessazione del Contratto, il Fornitore mettera a disposizione del Cliente un backup completo dei dati per un periodo di 30 giorni, trascorso il quale i dati saranno cancellati in modo irreversibile.`,
      },
      CLAUSE_RISERVATEZZA,
      CLAUSE_PROTEZIONE_DATI,
      CLAUSE_LIMITAZIONE_RESPONSABILITA,
      CLAUSE_FORZA_MAGGIORE,
      CLAUSE_FORO,
      CLAUSE_DISPOSIZIONI_FINALI,
    ],
  },
]

// ─── Helper Functions ───────────────────────────────────────

export function getContractTemplate(id: string): ContractTemplate | undefined {
  return CONTRACT_TEMPLATES.find((t) => t.id === id)
}

export function getContractTemplatesByCategory(category: string): ContractTemplate[] {
  return CONTRACT_TEMPLATES.filter((t) => t.category === category)
}
