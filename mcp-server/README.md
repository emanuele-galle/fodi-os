# FODI OS MCP Server

Server MCP che espone i dati di FODI OS come tool e risorse per Claude Code, Claude Desktop, o qualsiasi client MCP-compatible.

## Setup

```bash
cd mcp-server
npm install
npm run build
```

## Configurazione Claude Code

Aggiungi a `~/.mcp.json`:

```json
{
  "mcpServers": {
    "fodi-os": {
      "command": "node",
      "args": ["/var/www/projects/fodi-os/mcp-server/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://panel_user:PASSWORD@vps-panel-postgres:5432/fodi_os_db"
      }
    }
  }
}
```

## Tool disponibili

- `fodi_list_tasks` - Lista task con filtri
- `fodi_create_task` - Crea un nuovo task
- `fodi_update_task` - Aggiorna un task
- `fodi_list_clients` - Lista clienti CRM
- `fodi_list_leads` - Lista lead
- `fodi_list_deals` - Lista trattative
- `fodi_analytics_overview` - Panoramica analitica
- `fodi_search_platform` - Ricerca globale

## Risorse disponibili

- `fodi://projects` - Lista progetti
- `fodi://clients` - Lista clienti
- `fodi://dashboard` - Overview dashboard
