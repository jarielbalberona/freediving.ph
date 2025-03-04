# 🔹 Stage 1: Build
FROM node:20.10.0 AS builder

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory inside container
WORKDIR /usr/src/app

# Copy package files first for efficient caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies (including dev dependencies for build)
RUN pnpm install --frozen-lockfile --production=false

# Copy the rest of the app
COPY . .

# Build the Next.js app
RUN pnpm build

# ---

# 🔹 Stage 2: Run (Final Production Image)
FROM node:20.10.0 AS runner

# Enable pnpm in the final stage
RUN corepack enable && corepack prepare pnpm@latest --activate


# Set working directory
WORKDIR /usr/src/app

# Copy only necessary files from the build stage
COPY --from=builder /usr/src/app/.next ./.next
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/public ./public

# Expose the port Next.js runs on
EXPOSE 3000

# Start Next.js in production mode
CMD ["pnpm", "start"]
