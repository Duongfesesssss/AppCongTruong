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

# Copy source code first, then node_modules from deps stage
# This ensures clean node_modules from npm ci is used (not local ones)
COPY . .
COPY --from=deps /app/node_modules ./node_modules

# Build with production environment
ENV NODE_ENV=production
RUN npm run build

# Verify build output exists
RUN ls -la .output/public/_nuxt/ || echo "WARNING: _nuxt directory missing!"

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy the entire build output
COPY --from=builder /app/.output ./.output

# Nitro looks for public assets in server/chunks/public/ instead of public/
# Copy files directly (symlinks don't resolve reliably in Alpine)
RUN mkdir -p /app/.output/server/chunks/public && \
    cp -r /app/.output/public/. /app/.output/server/chunks/public/

# Expose port
EXPOSE 3000

# Run the app
CMD ["node", ".output/server/index.mjs"]
