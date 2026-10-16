# Production Dockerfile for Heritage Booking Backend
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install production dependencies first (utilize Docker layer caching)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source code
COPY src/ ./src/

# Expose server port
EXPOSE 3000

# Container healthcheck hitting the public health endpoint
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start Node application
CMD ["node", "src/app.js"]
