# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 600000

# Copy source code and build
COPY . .
RUN yarn build

# Production stage
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install production dependencies only
RUN yarn install --frozen-lockfile --production --network-timeout 600000

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

CMD ["yarn", "start"]
