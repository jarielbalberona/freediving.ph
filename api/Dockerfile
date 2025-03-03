# Stage 1: Build
FROM node:20.10.0 AS builder

# Enable pnpm globally
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /usr/src/api

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies (production only)
RUN pnpm install --frozen-lockfile --production=false

# Copy source code
COPY . .

# Build the project
RUN pnpm build

# Stage 2: Run
FROM node:20.10.0 AS runner

# Set working directory
WORKDIR /usr/src/api

# Copy built files from builder stage
COPY --from=builder /usr/src/api/dist ./dist
COPY --from=builder /usr/src/api/node_modules ./node_modules
COPY package.json ./

# Expose the port
EXPOSE 4000

# Run in production mode
CMD ["node", "dist/src/server.js"]

