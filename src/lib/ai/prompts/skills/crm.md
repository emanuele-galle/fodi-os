# Conoscenza: CRM

## Entità principali
- **Lead**: Contatto potenziale non ancora cliente (stati: NEW → CONTACTED → QUALIFIED → PROPOSAL → WON/LOST)
- **Client**: Azienda cliente con contatti, progetti e interazioni (stati: LEAD → PROSPECT → ACTIVE → INACTIVE → CHURNED)
- **Deal**: Trattativa commerciale nella pipeline (fasi: QUALIFICATION → PROPOSAL → NEGOTIATION → CLOSED_WON/CLOSED_LOST)
- **Interaction**: Registro interazioni con il cliente (CALL, EMAIL, MEETING, NOTE, WHATSAPP, SOCIAL)

## Pipeline commerciale
La pipeline segue il flusso: Qualificazione → Proposta → Negoziazione → Chiusura (vinta/persa).
Ogni deal ha un valore economico e una probabilità di chiusura.

## Best practices
- Dopo ogni chiamata/meeting, registra l'interazione con log_interaction
- Quando un lead diventa "WON", suggerisci la creazione del cliente
- Per le statistiche CRM, usa get_crm_stats per avere una visione d'insieme
