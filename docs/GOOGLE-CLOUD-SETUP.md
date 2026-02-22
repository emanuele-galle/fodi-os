# Google Cloud Setup per Nuove Istanze

Guida step-by-step per configurare Google Cloud (Calendar, Drive, Meet) per una nuova istanza del sistema operativo (es. "Muscari OS", "Esempio OS").

**Importante:** Ogni istanza DEVE avere il proprio Google Cloud Project separato per isolamento completo dei dati.

## Prerequisiti

- Account Google con accesso a [Google Cloud Console](https://console.cloud.google.com)
- Dominio dell'istanza configurato e raggiungibile (es. `https://os.muscari.it`)

## Step 1: Creare Google Cloud Project

1. Vai su [Google Cloud Console](https://console.cloud.google.com)
2. Click su "Seleziona progetto" → "Nuovo progetto"
3. Nome progetto: `{Brand Name} OS` (es. "Muscari OS")
4. Click "Crea"

## Step 2: Abilitare le API

Nella console del progetto appena creato, vai su **API e servizi** → **Libreria** e abilita:

1. **Google Calendar API**
2. **Google Drive API**
3. **Google Meet REST API** (opzionale, per videoconferenze)

## Step 3: Configurare Consent Screen

1. Vai su **API e servizi** → **Schermata di consenso OAuth**
2. Seleziona **Esterno** (o Interno se Google Workspace)
3. Compila:
   - **Nome app:** `{Brand Name} OS`
   - **Email assistenza:** email del cliente
   - **Logo:** logo del cliente
   - **Dominio autorizzato:** `{dominio}` (es. `muscari.it`)
   - **Link informativa privacy:** `https://{dominio}/privacy`
   - **Email contatto:** email del cliente
4. Aggiungi gli **Scope**:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/meetings.space.settings` (se Meet abilitato)
   - `https://www.googleapis.com/auth/meetings.space.created` (se Meet abilitato)
5. Aggiungi utenti di test (se in modalita "Testing")

## Step 4: Creare Credenziali OAuth

1. Vai su **API e servizi** → **Credenziali**
2. Click **Crea credenziali** → **ID client OAuth 2.0**
3. Tipo: **Applicazione web**
4. Nome: `{Brand Name} OS Web`
5. **URI di reindirizzamento autorizzati:**
   ```
   https://{dominio}/api/auth/google/callback
   ```
   Esempio: `https://os.muscari.it/api/auth/google/callback`
6. Click "Crea" e annota:
   - **Client ID** (es. `123456789-abc.apps.googleusercontent.com`)
   - **Client Secret** (es. `GOCSPX-...`)

## Step 5: Configurare le Variabili d'Ambiente

Nel file `.env` dell'istanza, aggiungere:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=https://{dominio}/api/auth/google/callback

# Google Cloud Project (reference)
GOOGLE_CLOUD_PROJECT_ID=muscari-os-12345

# Google Drive admin (opzionale - ID utente specifico per operazioni Drive)
# Se non impostato, usa il primo admin con Google connesso
GOOGLE_DRIVE_ADMIN_ID=
```

## Step 6: Deploy e Connessione Admin

1. Riavvia il container Docker per applicare le nuove env vars
2. L'admin accede al sistema → **Impostazioni** → **Google** → **Connetti**
3. Viene reindirizzato alla consent screen Google → autorizza
4. Da questo momento:
   - Google Calendar sincronizzato
   - Google Drive backup automatico per allegati e documenti
   - Google Meet disponibile (se abilitato)

## Step 7: Verifica

Dopo la connessione dell'admin, verificare che tutto funzioni:

```bash
# Health check endpoint
curl -s https://{dominio}/api/auth/google/health \
  -H "Cookie: {admin_session_cookie}" | jq .
```

Risultato atteso:
```json
{
  "success": true,
  "data": {
    "configured": true,
    "tokenPresent": true,
    "tokenValid": true,
    "driveAccessible": true,
    "scopes": "...",
    "adminUserId": "...",
    "error": null
  }
}
```

## Note Importanti

- **Isolamento:** Ogni istanza ha il suo Google Cloud Project. I file su Google Drive sono completamente separati.
- **Fallback:** Se Google non e configurato (niente `GOOGLE_CLIENT_ID`), il sistema funziona normalmente usando solo MinIO per lo storage. Google Drive e un backup opzionale.
- **Quota:** Google Drive API ha limiti di quota (default: 20,000 query/100s). Per istanze con alto volume di upload, monitorare la quota nella Cloud Console.
- **Produzione:** Per uscire dalla modalita "Testing" della consent screen, bisogna pubblicare l'app (richiede verifica Google se si usano scope sensibili).

## Troubleshooting

| Problema | Causa | Soluzione |
|----------|-------|-----------|
| "Nessun admin con Google connesso" | Admin non ha fatto OAuth | Admin va su Impostazioni → Google → Connetti |
| "Token scaduto o revocato" | Refresh token non funziona | Admin deve ricollegare Google |
| "Scope drive.file mancante" | OAuth fatto con scope vecchi | Admin deve scollegare e ricollegare Google |
| "GOOGLE_CLIENT_ID non configurato" | Env var mancante | Aggiungere al .env e riavviare |
| Redirect URI mismatch | URL callback errato | Verificare che `GOOGLE_REDIRECT_URI` corrisponda a quello configurato nelle credenziali |
