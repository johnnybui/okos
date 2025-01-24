# Build stage
FROM oven/bun:1.2-slim AS builder

WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source code and build
COPY . .
RUN bun run build

# Production stage
FROM oven/bun:1.2-slim

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install production dependencies only
RUN bun install --frozen-lockfile --production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

CMD ["bun", "start"]
