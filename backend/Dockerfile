# API production image (Node 22, ESM). Build: tsc → dist; run: node dist/index.js
FROM node:22-bookworm-slim

WORKDIR /app

# Build deps cho argon2 (native) — phòng khi không có prebuilt binary
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY migrations ./migrations
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/index.js"]
