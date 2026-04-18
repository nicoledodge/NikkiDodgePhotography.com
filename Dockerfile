# syntax=docker/dockerfile:1

# Build stage: installs dependencies and compiles the Vite bundle
FROM node:24-bullseye AS builder
WORKDIR /app

ENV NODE_ENV=development
ARG VITE_PORTFOLIO_IMAGE_BASE_URL=""
ENV VITE_PORTFOLIO_IMAGE_BASE_URL=${VITE_PORTFOLIO_IMAGE_BASE_URL}

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 build-essential \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime stage: ship the built site and API runtime on the app port
FROM node:24-bullseye-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server

EXPOSE 5000

CMD ["node", "dist-server/server.js"]
