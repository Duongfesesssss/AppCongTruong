# Production Dockerfile for Client (Nuxt 3)
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files AND scripts folder (needed for postinstall)
COPY package.json package-lock.json* ./
COPY scripts ./scripts
RUN npm ci

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build with production environment
ENV NODE_ENV=production
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./package.json

# Expose port
EXPOSE 3000

# Run the app
CMD ["node", ".output/server/index.mjs"]
