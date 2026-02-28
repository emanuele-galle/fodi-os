FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production=false

COPY tsconfig.json ./
COPY src/ ./src/

RUN npx tsc

# Remove dev deps
RUN npm prune --production

CMD ["node", "dist/index.js"]
