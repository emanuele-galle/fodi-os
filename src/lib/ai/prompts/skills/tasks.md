# Conoscenza: Gestione Task e Progetti

## Struttura Task
Ogni task ha: titolo, descrizione, stato, priorità, assegnatario, progetto, cartella (folderId), scadenza.

## Stati possibili
- **TODO**: Da fare
- **IN_PROGRESS**: In lavorazione
- **IN_REVIEW**: In revisione
- **DONE**: Completato
- **CANCELLED**: Annullato

## Priorità
LOW < MEDIUM < HIGH < URGENT

## Tool disponibili — guida rapida

### Duplicazione progetti
Per duplicare un progetto completo (cartelle, task, subtask, membri), usa **duplicate_project** — è un'unica operazione atomica in transazione. Supporta replaceText/replaceWith per adattare automaticamente i nomi nei titoli di task e cartelle (es. da "Bodini" a "Zucco").

### Operazioni batch su task
- **bulk_update_tasks**: aggiorna stato, priorità, assegnatario o cartella di più task contemporaneamente. Molto più efficiente di chiamare update_task ripetutamente.
- **move_task_to_folder**: sposta più task in una cartella specifica in un'unica operazione.

### Gestione membri
- **search_users**: SEMPRE usare prima di add_project_member per trovare l'ID utente corretto. Cerca per nome, cognome, email o username.
- **batch_add_member_to_projects**: aggiunge un utente a più progetti in un'unica operazione. Valida automaticamente l'utente e salta i progetti in cui è già membro.
- **add_project_member**: aggiunge un utente a un singolo progetto. Valida l'utente e segnala se è già membro.

### Creazione clienti CRM
- **create_client**: crea un nuovo cliente nel CRM. Richiede solo companyName.
- Dopo aver creato un progetto per un nuovo cliente, ricorda di creare anche il record cliente se non esiste e collegarlo con update_project(clientId).

## Best practices

### Creazione task
- Quando crei un task, suggerisci sempre una priorità appropriata
- Se non viene specificato un assegnatario, assegna all'utente corrente
- Per task urgenti, segnala proattivamente eventuali conflitti di scadenza

### Caricamento completo
- **list_tasks** ha un default di 50 risultati e un massimo di 100
- Se il progetto ha più task del limite, fai chiamate multiple
- Prima di organizzare/spostare task, carica SEMPRE tutti i task del progetto
- Verifica sempre che il totale corrisponda al numero di risultati ricevuti

### Spostamento task in cartelle
- Per batch: usa **move_task_to_folder** o **bulk_update_tasks** con folderId
- Per singolo task: usa **update_task** con folderId
- Dopo lo spostamento, il risultato include folderId e folderName per conferma
- Se devi spostare molti task, raggruppa per cartella di destinazione

### Ricerca utenti
- SEMPRE usa **search_users** per trovare l'ID di un utente prima di operazioni
- Non tentare di indovinare gli ID utente — cerca per nome, email o username
- Per aggiungere un utente a molti progetti, usa **batch_add_member_to_projects**

### Verifica risultati
- Dopo operazioni critiche, verifica il risultato con una GET
- Non dichiarare "Fatto!" basandoti solo su success:true
- Se il risultato non include i campi modificati, fai una query di verifica
