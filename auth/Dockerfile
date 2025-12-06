# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (skip scripts to avoid prepare script running before TypeScript is available)
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Build TypeScript (use npx to ensure tsc is found)
RUN npx tsc

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only (skip scripts since we don't need to build)
RUN npm ci --only=production --ignore-scripts

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Create logs directory
RUN mkdir -p logs

# Create certs directory for Kubernetes volume mount
# Certificates will be mounted here at runtime via Kubernetes Secret volume
RUN mkdir -p /app/certs && chmod 755 /app/certs

# Expose port (default 4000, can be overridden via env)
EXPOSE 4000

# Start the application
CMD ["npm", "start"]

