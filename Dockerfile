# syntax=docker/dockerfile:1

# Build stage: installs dependencies and compiles TypeScript + Vite assets
FROM node:20-bullseye AS builder
WORKDIR /app

ENV NODE_ENV=development

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 build-essential \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime stage: minimal image with production dependencies only
FROM node:20-bullseye-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy compiled output from the build stage
COPY --from=builder /app/dist ./dist

# Expose API port (frontend assets are served by the compiled server)
EXPOSE 5000

CMD ["node", "dist/server.js"]
