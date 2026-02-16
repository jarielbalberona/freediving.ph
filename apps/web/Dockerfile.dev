# Use Node.js as base image
FROM node:20.10.0

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory inside container
WORKDIR /usr/src/app

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install dependencies (include dev dependencies for development)
RUN pnpm install

# Copy the rest of the app
COPY . .

# Expose the Next.js port
EXPOSE 3000

# Start Next.js in development mode
CMD ["pnpm", "dev"]
