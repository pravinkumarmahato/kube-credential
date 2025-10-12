# Stage 1: Builder
FROM node:lts-bullseye-slim AS builder
WORKDIR /app

# Copy dependencies first (for layer caching)
COPY package.json package-lock.json* ./
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential python3 ca-certificates g++ make python-is-python3 && \
    rm -rf /var/lib/apt/lists/*
RUN npm install --silent

# Copy source code and build
COPY . .
RUN npm run build


# Stage 2: Runtime
FROM node:lts-bullseye-slim
WORKDIR /app

# Copy only what's needed
COPY package.json package-lock.json* ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Set environment variables and expose port
ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/server.js"]
