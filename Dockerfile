
# =============================================================================
# STAGE 1: Build (using full Node image to compile the app)
# =============================================================================
FROM node:24 AS build

WORKDIR /app

# Enabe Core pack for pnpm
RUN corepack enable

# Copy package files first (better layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install ALL dependencies (needed for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# =============================================================================
# STAGE 2: Production (smaller image for runtime)
# =============================================================================
FROM node:24-alpine AS production

# Add labels for better maintainability
# LABEL maintainer="mike.rodrigues.lima@gmail.com"
LABEL description="ng.com.waheedianho.starters.nest template"

# Set NODE_ENV
ENV NODE_ENV=production

WORKDIR /app

# Enabe Core pack for pnpm
RUN corepack enable

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nestjs

# Copy only production dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --prod --frozen-lockfile

# Copy built application from build stage
COPY --from=build /app/dist ./dist

# Set ownership to non-root user
RUN chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Start the application
CMD ["node", "dist/main.js"]
