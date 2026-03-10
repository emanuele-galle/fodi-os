# Conoscenza: Gestione Task

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

## Duplicazione progetti
Per duplicare un progetto completo (cartelle, task, subtask, membri), usa **duplicate_project** — è un'unica operazione atomica. Supporta replaceText/replaceWith per adattare i nomi automaticamente.

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
- Usa **move_task_to_folder** per spostare più task contemporaneamente (batch)
- Usa **update_task** con folderId per spostare un singolo task
- Dopo lo spostamento, il risultato include folderId e folderName per conferma
- Se devi spostare molti task, raggruppa per cartella di destinazione e usa move_task_to_folder

### Ricerca utenti
- SEMPRE usa **search_users** per trovare l'ID di un utente prima di operazioni come assegnazione task o aggiunta a progetti
- Non tentare di indovinare gli ID utente — cerca per nome, email o username
