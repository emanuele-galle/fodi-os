FROM node:24-alpine AS base

# Dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG DATABASE_URL
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY
ARG NEXT_PUBLIC_BRAND_NAME
ARG NEXT_PUBLIC_BRAND_SLUG
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_BRAND_LOGO_DARK
ARG NEXT_PUBLIC_BRAND_LOGO_LIGHT
ENV NEXT_PUBLIC_BRAND_NAME=$NEXT_PUBLIC_BRAND_NAME
ENV NEXT_PUBLIC_BRAND_SLUG=$NEXT_PUBLIC_BRAND_SLUG
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_BRAND_LOGO_DARK=$NEXT_PUBLIC_BRAND_LOGO_DARK
ENV NEXT_PUBLIC_BRAND_LOGO_LIGHT=$NEXT_PUBLIC_BRAND_LOGO_LIGHT
ARG NEXT_PUBLIC_BRAND_STORAGE_URL
ENV NEXT_PUBLIC_BRAND_STORAGE_URL=$NEXT_PUBLIC_BRAND_STORAGE_URL
ARG BRAND_NAME
ARG BRAND_SLUG
ARG BRAND_COMPANY
ARG BRAND_DESCRIPTION
ARG BRAND_LOGO_DARK
ARG BRAND_LOGO_LIGHT
ARG BRAND_STORAGE_URL
ENV BRAND_NAME=$BRAND_NAME
ENV BRAND_SLUG=$BRAND_SLUG
ENV BRAND_COMPANY=$BRAND_COMPANY
ENV BRAND_DESCRIPTION=$BRAND_DESCRIPTION
ENV BRAND_LOGO_DARK=$BRAND_LOGO_DARK
ENV BRAND_LOGO_LIGHT=$BRAND_LOGO_LIGHT
ENV BRAND_STORAGE_URL=$BRAND_STORAGE_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN DATABASE_URL="$DATABASE_URL" npx prisma generate
RUN npm run build

# Prisma CLI (minimal install for migrate deploy only)
FROM base AS prisma-cli
WORKDIR /prisma-cli
RUN echo '{"private":true}' > package.json && npm install prisma@7.4.1 && rm -rf /root/.npm /tmp/*

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# nodemailer is loaded via dynamic require() so standalone doesn't auto-include it
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/nodemailer ./node_modules/nodemailer

# Prisma migrate deploy: self-contained directory with CLI + schema + migrations + config
COPY --from=builder --chown=nextjs:nodejs /app/prisma /app/prisma-cli/prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.docker.js /app/prisma-cli/prisma.config.js
COPY --from=prisma-cli --chown=nextjs:nodejs /prisma-cli/node_modules /app/prisma-cli/node_modules
COPY --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["sh", "./docker-entrypoint.sh"]
