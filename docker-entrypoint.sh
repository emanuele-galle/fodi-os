#!/bin/sh
set -e

echo "Running Prisma migrations..."
# Run from prisma-cli dir so node_modules resolve correctly
# Use .js config to avoid TypeScript/ESM issues
cd /app/prisma-cli
node ./node_modules/prisma/build/index.js migrate deploy 2>&1 || {
  echo "WARNING: Prisma migrate deploy failed, starting app anyway"
}

echo "Starting application..."
cd /app
exec node server.js
