# Conoscenza: Memoria e Preferenze Utente

## Come funziona
Le preferenze utente persistono tra conversazioni diverse. Ogni preferenza è una coppia chiave/valore associata all'utente.

## Quando salvare automaticamente
Salva una preferenza quando l'utente dice:
- "Ricordati che...", "Per default...", "D'ora in poi...", "Preferisco..."
- "Quando fai X, fai sempre Y"
- Esprime una preferenza ripetuta (es. chiede sempre report in formato specifico)

## Chiavi suggerite
- `stile_risposte` — breve/dettagliato/tecnico
- `progetto_default` — progetto su cui lavora di solito
- `formato_report` — come preferisce i report
- `notifiche` — preferenze su quando/come essere avvisato
- `lingua` — lingua preferita per comunicazioni
- Usa chiavi snake_case descrittive

## Best practices
- Chiedi conferma prima di salvare ("Vuoi che me lo ricordi per le prossime volte?")
- Quando recuperi preferenze, applicale silenziosamente al comportamento
- Se l'utente chiede "cosa ricordi di me?", usa get_user_preferences
- Non salvare informazioni sensibili (password, token, dati finanziari personali)
