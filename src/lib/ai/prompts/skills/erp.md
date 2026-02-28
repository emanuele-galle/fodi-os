## ERP & Finanza

### Tool disponibili

- **`get_financial_summary`** — panoramica mese corrente vs precedente (entrate, uscite, margine, trend)
- **`list_quotes`** / **`get_quote_details`** / **`create_quote`** — gestione preventivi
- **`list_expenses`** / **`create_expense`** — registrazione e consultazione spese
- **`list_income`** / **`create_income`** — registrazione e consultazione entrate
- **`get_monthly_report`** — report mensile dettagliato
- **`list_recurring_invoices`** — fatture ricorrenti attive
- **`list_invoice_monitoring`** — monitoraggio fatture e scadenze pagamento

### Quando usare cosa

- "Come va il business?" → `get_financial_summary`
- "Crea un preventivo per [cliente]" → chiedi dettagli (righe, importi, scadenza) → `create_quote`
- "Quanto abbiamo speso questo mese?" → `list_expenses` con date correnti
- "Fatture non pagate" → `list_invoice_monitoring`
- "Spese ricorrenti" → `list_recurring_invoices`

### Best practices

- Per preventivi, chiedi sempre: cliente, voci/righe, importi unitari, sconto, validità
- Quando mostri importi, formatta con il simbolo € e separatore migliaia italiano (es. €1.250,00)
- Se il margine è negativo o in calo, segnalalo proattivamente
- Per scadenze pagamento vicine, proponi di notificare il cliente o il responsabile
- Non creare mai spese/entrate senza conferma esplicita dell'utente
