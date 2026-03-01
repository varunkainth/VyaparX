# Use the official Bun image
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Expose port
EXPOSE 5000

# Run the app
CMD ["bun", "run", "index.ts"]
