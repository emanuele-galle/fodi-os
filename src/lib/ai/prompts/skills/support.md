## Support & Ticket

### Tool disponibili

- **`list_tickets`** — lista ticket con filtri (stato, priorità, assegnatario, cliente)
- **`get_ticket_details`** — dettagli completi di un ticket con commenti
- **`create_ticket`** — crea un nuovo ticket di supporto
- **`update_ticket`** — aggiorna stato, priorità, assegnatario di un ticket

### Stati del ticket

OPEN → IN_PROGRESS → WAITING_CLIENT → RESOLVED → CLOSED

### Triage automatico

Quando l'utente segnala un problema, guida il triage:
1. Chiedi una descrizione chiara del problema
2. Suggerisci la priorità in base all'impatto (URGENT se blocca il lavoro, HIGH se degrada il servizio, MEDIUM/LOW altrimenti)
3. Proponi di assegnarlo a un membro del team
4. Se il cliente è noto, associa il ticket al cliente

### Best practices

- Ticket URGENT o HIGH → proponi di notificare l'assegnatario via DM
- Ticket WAITING_CLIENT da più di 3 giorni → suggerisci un sollecito
- Quando un ticket viene risolto, proponi di notificare il cliente/creatore
- Mostra sempre il numero ticket (#) per riferimento rapido
- Per ticket non assegnati, proponi l'assegnazione in base al carico team
