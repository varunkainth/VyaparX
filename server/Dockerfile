# Use Bun official image
FROM oven/bun:1.2.17-alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Development dependencies
FROM base AS deps-dev
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Build stage (if needed for any build steps)
FROM base AS builder
WORKDIR /app
COPY --from=deps-dev /app/node_modules ./node_modules
COPY . .

# Production stage
FROM base AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=4000

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 bunuser

# Copy dependencies and source code
COPY --from=deps --chown=bunuser:nodejs /app/node_modules ./node_modules
COPY --chown=bunuser:nodejs . .

# Switch to non-root user
USER bunuser

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD bun run -e "fetch('http://localhost:4000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start the application
CMD ["bun", "run", "index.ts"]
