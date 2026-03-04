#!/bin/sh
set -e

# Wait for PostgreSQL to be ready (TCP check via Node.js)
echo "Waiting for database..."
DB_HOST=$(node -e "const u = new URL(process.env.DATABASE_URL); console.log(u.hostname)")
DB_PORT=$(node -e "const u = new URL(process.env.DATABASE_URL); console.log(u.port || 5432)")

RETRIES=30
until node -e "
  const net = require('net');
  const s = new net.Socket();
  s.setTimeout(2000);
  s.connect(${DB_PORT}, '${DB_HOST}', () => { s.destroy(); process.exit(0); });
  s.on('error', () => process.exit(1));
  s.on('timeout', () => { s.destroy(); process.exit(1); });
" 2>/dev/null; do
  RETRIES=$((RETRIES - 1))
  if [ "$RETRIES" -eq 0 ]; then
    echo "ERROR: Database not ready after 30 attempts. Exiting."
    exit 1
  fi
  echo "Database not ready, retrying... ($RETRIES attempts left)"
  sleep 2
done

echo "Database is ready. Running Prisma migrations..."
cd /app/prisma-cli
if ! node ./node_modules/prisma/build/index.js migrate deploy 2>&1; then
  echo "ERROR: Prisma migrate deploy failed. Exiting."
  exit 1
fi

echo "Starting application..."
cd /app
exec node server.js
