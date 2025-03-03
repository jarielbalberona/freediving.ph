# Use Node.js as base image
FROM node:20.10.0

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory inside container
WORKDIR /usr/src/app

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install dependencies inside the container
RUN pnpm install

# Copy the entire project
COPY . .

# Expose the port the API runs on
EXPOSE 4000

# Start in development mode
CMD ["pnpm", "run", "dev"]
